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
    Commonly used functions.
*/

'use strict';

const log = require('loglevel').getLogger('system');
const constants = require('../constants.js');
const crypto = require('crypto');
const _secret_ = process.env.SECRET;
let utils = (module.exports = {});

utils.getDateMinusHours = function(hours) {
  const hoursAgo = new Date(Date.now() - hours * constants.HOUR_IN_MILLIS);
  return hoursAgo;
};

function createSendPrivateMsgFunction(msg, bot) {
  return function(text) {
    return bot
      .sendMessage(msg.from.id, text)
      .then(() => {
        log.debug('sent private message');
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't send private msg! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

function createSendChatMsgFunction(msg, bot) {
  return function(text) {
    return bot
      .sendMessage(msg.chat.id, text)
      .then(() => {
        log.debug('sent chat message');
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't send chat msg! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

function createSendMsgToFunction(msg, bot) {
  return function(chatId, text, options) {
    return bot
      .sendMessage(chatId, text, options)
      .then(() => {
        log.debug('sent message');
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't send msg! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

function createSendPhotoFunction(msg, bot) {
  return function(chatId, stream, options) {
    return bot
      .sendPhoto(chatId, stream, options)
      .then(() => {
        log.debug('sent photo to chat ' + chatId);
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't send photo! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

function createSendDocumentFunction(msg, bot) {
  return function(chatId, buffer, options, fileOptions) {
    return bot
      .sendDocument(chatId, buffer, options, fileOptions)
      .then(() => {
        log.debug('sent document to chat ' + chatId);
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't send document! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

function createEditMessageTextFunction(msg, bot) {
  return function(text, options) {
    return bot
      .editMessageText(text, options)
      .then(() => {
        log.debug('edited message');
        return Promise.resolve();
      })
      .catch(err => {
        log.error("couldn't edit message! Err: " + err);
        log.debug(err.stack);
        return Promise.reject(err);
      });
  };
}

utils.hookNewRelic = function(url, func) {
  return new Promise(function(resolve, reject) {
    if (global.newrelic && global.newrelic.startWebTransaction) {
      global.newrelic.startWebTransaction(url, function() {
        let p = func();
        if (p && p.then) {
          p.then(() => {
            global.newrelic.getTransaction().end();
            resolve();
          }).catch(err => {
            global.newrelic.noticeError(err);
            global.newrelic.getTransaction().end();
            reject(err);
          });
        } else {
          global.newrelic.getTransaction().end();
          resolve();
        }
      });
    } else {
      let p = func();
      if (p && p.then) {
        p.then(() => {
          resolve();
        }).catch(err => reject(err));
      } else {
        resolve();
      }
    }
  });
};

/*
    Shows a status like "sending photo..." in the chat while work() runs.
    Telegram clears the status after 5 seconds, so it is repeated every 4.
    Failures to send the status are ignored.
*/
const CHAT_ACTION_REPEAT_MS = 4000;
function createWhileChatActionFunction(msg, bot) {
  return function(action, work) {
    const show = () => {
      if (typeof bot.sendChatAction === 'function') {
        bot.sendChatAction(msg.chat.id, action).catch(err => log.debug('chat action failed: ' + err));
      }
    };
    show();
    const timer = setInterval(show, CHAT_ACTION_REPEAT_MS);
    return Promise.resolve()
      .then(work)
      .finally(() => clearInterval(timer));
  };
}

utils.attachMethods = function attachMethods(msg, bot) {
  msg.whileChatAction = createWhileChatActionFunction(msg, bot);
  msg.sendPrivateMessage = createSendPrivateMsgFunction(msg, bot);
  msg.sendChatMessage = createSendChatMsgFunction(msg, bot);
  msg.sendMessage = createSendMsgToFunction(msg, bot);
  msg.sendPhoto = createSendPhotoFunction(msg, bot);
  msg.sendDocument = createSendDocumentFunction(msg, bot);
  msg.editMessageText = createEditMessageTextFunction(msg, bot);
};

utils.roundTo = (n, t) => {
  t = t || 0;
  return Math.round(n * Math.pow(10, t)) / Math.pow(10, t);
};

utils.getRandomFromArray = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

utils.isValidInt = function(num) {
  const n = Number(num);
  const int = parseInt(num, 10);
  return !isNaN(int) && (typeof int === 'number' || int instanceof Number) && int === n;
};

utils.isValidFloat = function(num) {
  const n = utils.toNumber(num);
  const float = utils.parseFloat(num);
  return !isNaN(float) && (typeof float === 'number' || float instanceof Number) && float === n;
};

utils.parseFloat = function(num) {
  if (typeof num === 'string') {
    // convert , to .
    return parseFloat(num.replace(/\,/g, '.'));
  } else if (typeof num === 'number') {
    return parseFloat(num);
  } else {
    return NaN;
  }
};

utils.toNumber = function(num) {
  if (typeof num === 'string') {
    // convert , to .
    return Number(num.replace(/\,/g, '.'));
  } else if (typeof num === 'number') {
    return Number(num);
  } else {
    return NaN;
  }
};

/*
    Wad's 16 color palette
    http://alumni.media.mit.edu/~wad/color/numbers.html
*/
const wadsPalette = [
  [0, 0, 0], // Black
  [87, 87, 87], // Dk. Gray
  [173, 35, 35], // Red
  [42, 75, 215], // Blue
  [29, 105, 20], // Green
  [129, 74, 25], // Brown
  [129, 38, 192], // Purple
  [160, 160, 160], // Lt. Gray
  [129, 197, 122], // Lt. Green
  [157, 175, 255], // Lt. Blue
  [41, 208, 208], // Cyan
  [255, 146, 51], // Orange
  [255, 238, 51], // Yellow
  [233, 222, 187], // Tan
  [255, 205, 243], // Pink
  // [255, 255, 255] // White
];

utils.getColorSet = function() {
  return [].concat(wadsPalette); // return a copy
};

utils.hashSha256 = function(data) {
  const hash = crypto.createHash('sha256');
  hash.update('' + data); // tostring
  return hash.digest('hex');
};

/*
    Nick encryption. New values use AES-256-GCM with a random IV and are
    authenticated, stored as "v2:" + base64(iv | tag | ciphertext).
    Values written by older versions (crypto.createCipher('aes192'), removed
    in Node 22) are still readable through legacyDecrypt and get rewritten
    in the new format by scripts/reencrypt_nicks.js or on the next update.
*/
const V2_PREFIX = 'v2:';
let _v2key_ = null;
function v2key() {
  if (!_v2key_) {
    if (!_secret_ || _secret_.length < 16) {
      throw new Error('SECRET env variable must be set and at least 16 characters long');
    }
    _v2key_ = crypto.scryptSync(_secret_, 'blakkisvuohi-nick-v2', 32);
  }
  return _v2key_;
}

function legacyDecrypt(data) {
  // EVP_BytesToKey(MD5, no salt, 1 round) as used by crypto.createDecipher
  const pass = Buffer.from(_secret_ || '', 'utf8');
  let material = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (material.length < 24 + 16) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, pass])).digest();
    material = Buffer.concat([material, prev]);
  }
  const decipher = crypto.createDecipheriv(
    'aes-192-cbc',
    material.subarray(0, 24),
    material.subarray(24, 40),
  );
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

utils.encrypt = function(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', v2key(), iv);
  const encrypted = Buffer.concat([cipher.update('' + data, 'utf8'), cipher.final()]);
  return V2_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
};

utils.decrypt = function(data) {
  if (typeof data !== 'string' || !data.startsWith(V2_PREFIX)) {
    return legacyDecrypt(data);
  }
  const raw = Buffer.from(data.slice(V2_PREFIX.length), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', v2key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
};

utils.isLegacyEncrypted = data => typeof data === 'string' && !data.startsWith(V2_PREFIX);

utils.groupDrinksByUser = drinks => {
  let drinksByUser = {};
  for (let i in drinks) {
    const drink = drinks[i];
    if (!drinksByUser[drink.userid]) {
      drinksByUser[drink.userid] = {
        userid: drink.userid,
        nick: utils.decrypt(drink.nick),
        weight: drink.weight,
        gender: drink.gender,
        height: drink.height,
        drinks: [],
      };
    }
    drinksByUser[drink.userid].drinks.push(drink);
  }
  return drinksByUser;
};

function toCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  let cell = value instanceof Date ? value.toISOString() : '' + value;
  // Stop spreadsheet programs from running user-entered text as a formula
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(cell)) {
    cell = "'" + cell;
  }
  return /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
}

/*
    Forms an RFC 4180 CSV string. The leading byte order mark
    makes Excel read the file as UTF-8, so that ä and ö stay intact.
*/
utils.toCsv = (columns, rows) => {
  const lines = [columns].concat(rows.map(row => columns.map(column => row[column])));
  return '﻿' + lines.map(line => line.map(toCsvCell).join(',') + '\r\n').join('');
};

/*
    Placeholder string format
    https://stackoverflow.com/questions/18405736/is-there-a-c-sharp-string-format-equivalent-in-javascript
*/
String.prototype.format = function(placeholders) {
  let s = this;
  for (let propertyName in placeholders) {
    let re = new RegExp('{' + propertyName + '}', 'gm');
    s = s.replace(re, placeholders[propertyName]);
  }
  return s;
};

String.prototype.unformat = function() {
  return this.replace(/{.+}/g, '');
};
