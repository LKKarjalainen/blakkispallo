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
    data.js
    unit tests for data.js functions
*/

/* globals describe, it, beforeEach */

'use strict';
require('../../app/commands/data.js');

const assert = require('assert');
const pg = require('pg');
const blakkistest = require('../blakkistest.js');
const Commands = require('../../app/lib/commands.js');
const strings = require('../../app/strings.js');
const utils = require('../../app/lib/utils.js');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

function callData(mocked, userIndex) {
  mocked.msg.from.id = blakkistest.realIds[userIndex];
  mocked.msg.chat.id = blakkistest.realIds[userIndex];
  return Commands.call('/data', mocked.msg, ['/data']);
}

function findDocument(mocked, filename) {
  return mocked.internals.sentDocuments.find(doc => doc.filename === filename);
}

describe('data.js', function() {
  beforeEach(blakkistest.resetDbWithTestUsersAndGroupsAndDrinks);

  it('Calling /data should send user, drinks and groups as CSV to the user', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    const user = blakkistest.users[0];
    callData(mocked, 0)
      .then(() => {
        const docs = mocked.internals.sentDocuments;
        assert.deepEqual(docs.map(doc => doc.filename), ['user.csv', 'drinks.csv', 'groups.csv']);
        docs.forEach(doc => {
          assert.equal(doc.chatId, blakkistest.realIds[0]);
          assert.equal(doc.contentType, 'text/csv');
        });

        const userLines = findDocument(mocked, 'user.csv').text.split('\r\n');
        assert.equal(
          userLines[0],
          '﻿userid,nick,weight,gender,height,read_terms,read_announcements,created',
        );
        const userCells = userLines[1].split(',');
        assert.equal(userCells[0], user.userId);
        assert.equal(userCells[1], user.username); // decrypted
        assert.equal(userCells[2], user.weight);
        assert.equal(userCells[3], user.gender);
        assert.equal(userCells[4], user.height);

        const drinkLines = findDocument(mocked, 'drinks.csv').text.split('\r\n');
        assert.equal(drinkLines[0], '﻿id,userid,alcohol,description,created');
        assert.equal(drinkLines.length, 4); // header, two drinks and the last line ending
        assert.notEqual(drinkLines[1].match(`,${user.userId},12347,kalja,`), null);

        const groupLines = findDocument(mocked, 'groups.csv').text.split('\r\n');
        assert.equal(groupLines[0], '﻿userid,groupid');
        assert.equal(groupLines[1], `${user.userId},${blakkistest.groups[0].group.groupId}`);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data should not send any data of other users', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    const others = blakkistest.users.slice(1);
    pool
      .query('insert into users_drinks (userid, alcohol, description) values ($1, 1, $2)', [
        others[0].userId,
        'salaisuus',
      ])
      .then(() => callData(mocked, 0))
      .then(() => {
        const allText = mocked.internals.sentDocuments.map(doc => doc.text).join('\n');
        assert.equal(allText.includes('salaisuus'), false);
        others.forEach(other => assert.equal(allText.includes(other.userId), false));
        assert.equal(findDocument(mocked, 'user.csv').text.split('\r\n').length, 3);
        assert.equal(findDocument(mocked, 'drinks.csv').text.split('\r\n').length, 4);
        assert.equal(findDocument(mocked, 'groups.csv').text.split('\r\n').length, 3);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data in a group with bot suffix should only send a private notice', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    mocked.msg.from.id = blakkistest.realIds[0];
    mocked.msg.chat.type = 'chat';
    mocked.msg.chat.id = blakkistest.groups[0].realId;
    Commands.call('/data', mocked.msg, ['/data@bot'], ['@bot', 'bot'])
      .then(() => {
        assert.equal(mocked.internals.sentDocuments.length, 0);
        assert.equal(mocked.internals.sentChatId, blakkistest.realIds[0]);
        assert.equal(mocked.internals.sentText, strings.commands.blakkis.use_only_in_private);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data in a group without bot suffix should send nothing', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    mocked.msg.from.id = blakkistest.realIds[0];
    mocked.msg.chat.type = 'chat';
    mocked.msg.chat.id = blakkistest.groups[0].realId;
    Commands.call('/data', mocked.msg, ['/data'])
      .then(() => {
        assert.equal(mocked.internals.sentDocuments.length, 0);
        assert.equal(mocked.internals.sentText, false);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data without any stored data should send a message and no files', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    Commands.call('/data', mocked.msg, ['/data'])
      .then(() => {
        assert.equal(mocked.internals.sentDocuments.length, 0);
        assert.equal(mocked.internals.sentText, strings.commands.data.no_data);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data should work for a user who has not accepted the terms', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    pool
      .query('update users set read_terms=false where userId=$1', [blakkistest.users[0].userId])
      .then(() => callData(mocked, 0))
      .then(() => {
        assert.equal(mocked.internals.sentDocuments.length, 3);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data should include drinks whose user row is missing', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    pool
      .query('delete from users where userId=$1', [blakkistest.users[0].userId])
      .then(() => callData(mocked, 0))
      .then(() => {
        assert.equal(findDocument(mocked, 'user.csv').text.split('\r\n').length, 2);
        assert.equal(findDocument(mocked, 'drinks.csv').text.split('\r\n').length, 4);
        done();
      })
      .catch(err => done(err));
  });

  it('Calling /data should escape user-entered drink names', function(done) {
    const mocked = blakkistest.mockMsgAndBot();
    const userId = blakkistest.users[0].userId;
    pool
      .query('delete from users_drinks')
      .then(() =>
        pool.query(
          'insert into users_drinks (userid, alcohol, description) values ($1, 1, $2), ($1, 2, $3)',
          [userId, 'Olut, "iso"\nJälkkäri', '=HYPERLINK("x")'],
        ),
      )
      .then(() => callData(mocked, 0))
      .then(() => {
        const text = findDocument(mocked, 'drinks.csv').text;
        assert.equal(text.includes(',"Olut, ""iso""\nJälkkäri",'), true);
        assert.equal(text.includes(`,"'=HYPERLINK(""x"")",`), true);
        done();
      })
      .catch(err => done(err));
  });
});

describe('utils.toCsv', function() {
  it('should format values and leave non-text values untouched', function() {
    const date = new Date('2020-01-02T03:04:05.000Z');
    const csv = utils.toCsv(['a', 'b', 'c', 'd', 'e'], [
      { a: -5, b: true, c: null, d: date, e: undefined },
    ]);
    assert.equal(csv, '﻿a,b,c,d,e\r\n-5,true,,2020-01-02T03:04:05.000Z,\r\n');
  });

  it('should only output the header without rows', function() {
    assert.equal(utils.toCsv(['a', 'b'], []), '﻿a,b\r\n');
  });
});
