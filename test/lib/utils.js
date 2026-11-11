/*
    Bläkkisvuohi, a Telegram bot to help track estimated blood alcohol concentration.
    Copyright (C) 2017  Joonas Ulmanen

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    utils.js
    unit tests for utils.js functions
*/

/* globals describe, it */

'use strict';

const assert = require('assert');
const blakkistest = require('../blakkistest.js');
const utils = require('../../app/lib/utils.js');
const realsecret = process.env.SECRET;

describe('utils', function() {
  describe('getDateMinusHours()', function() {
    it('should return current date with hours = 0', function() {
      const now = new Date().getTime();
      const then = utils.getDateMinusHours(0).getTime();
      const diff = now - then;
      assert(diff < 5);
    });

    it('should return date - 36*3600000 with hours = 36', function() {
      const now = new Date().getTime();
      const hourInMillis = 3600 * 1000;
      const hours = 36;
      assert(now - hours * hourInMillis === utils.getDateMinusHours(hours).getTime());
    });
  });

  describe('roundTo()', function() {
    it('should round PI to 3.14159 with n=5', function() {
      assert(utils.roundTo(Math.PI, 5) === 3.14159);
    });

    it('should round PI to 3 with n=0', function() {
      assert(utils.roundTo(Math.PI, 0) === 3);
    });
  });

  // impossible to test randomness. Going to fail some time in the future
  describe('getRandomFromArray()', function() {
    it('should get a random value from an array', function() {
      const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      let b = a.slice();
      let c = [];
      while (c.length !== a.length) {
        const randomValue = utils.getRandomFromArray(b);
        c.push(randomValue);
        b.splice(b.indexOf(randomValue), 1);
      }
      assert.equal(c.length, a.length);
      assert.equal(b.length, 0);
      c.forEach(v => {
        assert(a.find(av => av === v));
      });
      assert(c.some((v, i) => a[i] !== v));
    });
  });

  describe('hookNewRelic()', function() {
    let newRelicStart = false,
      newRelicEnd = false;

    function startWebTransaction(url, func) {
      newRelicStart = true;
      func();
    }

    function getTransaction() {
      return {
        end: function() {
          newRelicEnd = true;
        },
      };
    }

    it('should not hook newrelic if global.newrelic is not set', function(done) {
      newRelicStart = false;
      newRelicEnd = false;
      utils
        .hookNewRelic('lol', () => {})
        .then(() => {
          assert.equal(newRelicStart, false);
          assert.equal(newRelicEnd, false);
          done();
        })
        .catch(err => done(err));
    });

    it('should hook newrelic if global.newrelic is set', function(done) {
      newRelicStart = false;
      newRelicEnd = false;
      global.newrelic = {
        startWebTransaction: startWebTransaction,
        getTransaction: getTransaction,
        noticeError: () => {},
      };
      utils
        .hookNewRelic('lol', () => {})
        .then(() => {
          assert.equal(newRelicStart, true);
          assert.equal(newRelicEnd, true);
          done();
        })
        .catch(err => done(err));
    });

    it('should propagate error if the func errors', function(done) {
      newRelicStart = false;
      newRelicEnd = false;
      global.newrelic = {
        startWebTransaction: startWebTransaction,
        getTransaction: getTransaction,
        noticeError: () => {},
      };
      utils
        .hookNewRelic('lol', () => {
          throw new Error('test');
        })
        .then(() => {
          done(new Error("didn't error!"));
        })
        .catch(err => {
          try {
            assert.equal(err, 'Error: test');
            done();
          } catch (err) {
            done(err);
          }
        });
    });
  });

  describe('attachMethods', function() {
    let mocked = blakkistest.mockMsgAndBot();

    it('should attach functions to msg object', function() {
      let msg = Object.assign(mocked.msg);
      utils.attachMethods(msg, mocked.bot);
      assert.equal(typeof msg.sendPrivateMessage, 'function');
      assert.equal(typeof msg.sendMessage, 'function');
      assert.equal(typeof msg.sendChatMessage, 'function');
      assert.equal(typeof msg.sendPhoto, 'function');
    });

    it('attached function sendMessage should sent the message to provided chatId', function() {
      let msg = Object.assign(mocked.msg);
      utils.attachMethods(msg, mocked.bot);
      msg.sendMessage(1, 'text');
      assert.equal(mocked.internals.sentChatId, 1);
    });

    it('whileChatAction should repeat the chat action until the work is done and return its result', function() {
      this.timeout(10000);
      const m = blakkistest.mockMsgAndBot();
      const start = Date.now();
      return m.msg
        .whileChatAction('upload_photo', () => new Promise(resolve => setTimeout(() => resolve('done'), 4500)))
        .then(result => {
          assert.equal(result, 'done');
          assert.ok(Date.now() - start >= 4500);
          // once immediately and once after 4 seconds
          assert.equal(m.internals.chatActions.length, 2);
          assert.equal(m.internals.chatActions[0].action, 'upload_photo');
          assert.equal(m.internals.chatActions[0].chatId, m.msg.chat.id);
          const count = m.internals.chatActions.length;
          return new Promise(resolve => setTimeout(resolve, 4200)).then(() =>
            assert.equal(m.internals.chatActions.length, count, 'kept sending after work finished'),
          );
        });
    });

    it('whileChatAction should pass errors through and still work if the status fails', function() {
      const m = blakkistest.mockMsgAndBot();
      m.bot.sendChatAction = () => Promise.reject(new Error('Forbidden'));
      return m.msg
        .whileChatAction('upload_photo', () => Promise.reject(new Error('work failed')))
        .then(
          () => assert.fail('should have rejected'),
          err => assert.equal(err.message, 'work failed'),
        );
    });

    it('attached function sendPrivateMessage should sent the message to msg.from.id', function() {
      let msg = Object.assign(mocked.msg);
      utils.attachMethods(msg, mocked.bot);
      msg.sendPrivateMessage('text');
      assert.equal(mocked.internals.sentChatId, msg.from.id);
    });

    it('attached function sendChatMessage should sent the message to msg.chat.id', function() {
      let msg = Object.assign(mocked.msg);
      utils.attachMethods(msg, mocked.bot);
      msg.sendChatMessage('text');
      assert.equal(mocked.internals.sentChatId, msg.chat.id);
    });

    it('attached function sendMessage should sent the message to provided chatId', function() {
      let msg = Object.assign(mocked.msg);
      utils.attachMethods(msg, mocked.bot);
      msg.sendPhoto(5, 'text');
      assert.equal(mocked.internals.sentChatId, 5);
    });
  });

  describe('isValidInt()', function() {
    it("should return true with 0, -140, 4, 100, '0'", function() {
      assert(utils.isValidInt(0));
      assert(utils.isValidInt(-140));
      assert(utils.isValidInt(4));
      assert(utils.isValidInt(100));
      assert(utils.isValidInt('0'));
    });

    it("should return false with 's', 0.4, '3.14', {}", function() {
      assert(!utils.isValidInt('s'));
      assert(!utils.isValidInt(0.4));
      assert(!utils.isValidInt('3.14'));
      assert(!utils.isValidInt({}));
    });
  });

  describe('isValidFloat()', function() {
    it("should return true with 0, -1210.40, PI, '0', '-3.14', '2,5'", function() {
      assert(utils.isValidFloat(0));
      assert(utils.isValidFloat(-1210.4));
      assert(utils.isValidFloat(Math.PI));
      assert(utils.isValidFloat('0'));
      assert(utils.isValidFloat('-3.14'));
      assert(utils.isValidFloat('2,5'));
    });

    it("should return false with 's', '-', null, {}", function() {
      assert(!utils.isValidFloat('s'));
      assert(!utils.isValidFloat('-'));
      assert(!utils.isValidFloat(null));
      assert(!utils.isValidFloat({}));
    });
  });

  describe('getColorSet()', function() {
    it('should return 15 colors', function() {
      assert(utils.getColorSet().length === 15);
    });

    it('should return a copy', function() {
      let first = utils.getColorSet();
      let second = utils.getColorSet();
      second.splice(1, 2);
      assert(first.length !== second.length);
    });
  });

  describe('hashSha256()', function() {
    it("should return correct sha256 digest for 1, 'test', 'reallylongstring'", function() {
      // sha256 sums from online generator
      const sha256_1 = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        sha256_test = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        sha256_reallylongstring =
          '116d9490a1b498ab3eebf92e1c6c42569f8c46f1c4dcfac332f1652875b156f2';

      assert(utils.hashSha256(1) === sha256_1);
      assert(utils.hashSha256('test') === sha256_test);
      assert(utils.hashSha256('reallylongstring') === sha256_reallylongstring);
    });
  });

  describe('encrypt()', function() {
    it('should not work with SECRET not set', function() {
      const data = 'test_data';
      process.env.SECRET = undefined;
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      try {
        utils1.encrypt(data);
        assert(false); // shouldn't execute
      } catch (err) {
        assert(true);
      }
    });

    it('should return different data with different secrets', function() {
      const data = 'test_data';

      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      const encrypted1 = utils1.encrypt(data);

      process.env.SECRET = 'test2-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils2 = require('../../app/lib/utils.js');
      const encrypted2 = utils2.encrypt(data);
      assert(encrypted1 !== encrypted2);
    });
  });

  describe('decrypt()', function() {
    it('should not work with SECRET not set', function() {
      const data = 'test_data';
      process.env.SECRET = undefined;
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      try {
        utils1.decrypt(data);
        assert(false); // shouldn't execute
      } catch (err) {
        assert(true);
      }
    });

    it("shouldn't work with any data", function() {
      const data = 'test_data';

      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      try {
        utils1.decrypt(data);
        assert(false); // shouldn't execute
      } catch (err) {
        assert(true);
      }
    });

    it('should decrypt correctly encrypted data', function() {
      const data = 'test_data';

      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      const encrypted1 = utils1.encrypt(data);
      assert(utils1.decrypt(encrypted1) === data);
    });

    it('should use a random IV so equal data encrypts differently', function() {
      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      assert(utils1.encrypt('same') !== utils1.encrypt('same'));
    });

    it('should reject tampered data', function() {
      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      const encrypted = utils1.encrypt('test_data');
      const raw = Buffer.from(encrypted.slice(3), 'base64');
      raw[raw.length - 1] ^= 1;
      assert.throws(() => utils1.decrypt('v2:' + raw.toString('base64')));
    });

    it('should decrypt data written in the legacy aes192 format', function() {
      process.env.SECRET = 'test1-long-enough-secret';
      delete require.cache[require.resolve('../../app/lib/utils.js')];

      const utils1 = require('../../app/lib/utils.js');
      // crypto.createCipher('aes192', 'test1-long-enough-secret') of 'test_data'
      const legacy = '21a00dff40c05153ea0cb9bd15ee86dd';
      assert(utils1.isLegacyEncrypted(legacy));
      assert.equal(utils1.decrypt(legacy), 'test_data');
    });
  });

  after(function() {
    delete require.cache[require.resolve('../../app/lib/utils.js')];
    process.env.SECRET = realsecret;
    require('../../app/lib/utils.js');
  });
});
