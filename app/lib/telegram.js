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
    telegram.js
    Minimal Telegram Bot API client on top of Node's built-in fetch, covering
    only the methods this bot uses. Replaces node-telegram-bot-api, whose
    dependency tree (request, form-data, tough-cookie, qs...) is unmaintained.

    Errors never contain the request URL, because it contains the bot token.
*/

'use strict';

const EventEmitter = require('events');
const log = require('loglevel').getLogger('system');

const API_ROOT = 'https://api.telegram.org';
const REQUEST_TIMEOUT_MS = 70 * 1000;
const POLL_TIMEOUT_S = 50;

class TelegramBot extends EventEmitter {
  constructor(token, options) {
    super();
    if (!token) {
      throw new Error('Bot token missing');
    }
    this._token = token;
    this._offset = 0;
    this._polling = false;
    if (options && options.polling) {
      this.startPolling();
    }
  }

  async _call(method, params, files) {
    let body, headers;
    if (files) {
      body = new FormData();
      for (const [key, value] of Object.entries(params || {})) {
        if (value !== undefined && value !== null) {
          body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      }
      for (const [key, file] of Object.entries(files)) {
        body.append(key, new Blob([file.data], { type: file.contentType }), file.filename);
      }
    } else {
      body = JSON.stringify(params || {});
      headers = { 'content-type': 'application/json' };
    }

    let res;
    try {
      res = await fetch(`${API_ROOT}/bot${this._token}/${method}`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // err.cause may include the URL; only keep its type
      throw new Error(`Telegram ${method} failed: ${err.name}`);
    }
    let json;
    try {
      json = await res.json();
    } catch (err) {
      throw new Error(`Telegram ${method} failed: HTTP ${res.status}`);
    }
    if (!json.ok) {
      const error = new Error(`Telegram ${method} failed: ${json.description || res.status}`);
      error.code = json.error_code;
      throw error;
    }
    return json.result;
  }

  processUpdate(update) {
    if (!update || typeof update !== 'object') {
      return;
    }
    if (typeof update.update_id === 'number') {
      this._offset = Math.max(this._offset, update.update_id + 1);
    }
    if (update.message) {
      this.emit('message', update.message);
    } else if (update.callback_query) {
      this.emit('callback_query', update.callback_query);
    }
  }

  async startPolling() {
    if (this._polling) {
      return;
    }
    this._polling = true;
    await this._call('deleteWebhook', {}).catch(err => log.error(err.message));
    while (this._polling) {
      try {
        const updates = await this._call('getUpdates', {
          offset: this._offset,
          timeout: POLL_TIMEOUT_S,
          allowed_updates: ['message', 'callback_query'],
        });
        for (const update of updates) {
          this.processUpdate(update);
        }
      } catch (err) {
        log.error('polling error: ' + err.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  stopPolling() {
    this._polling = false;
  }

  getMe() {
    return this._call('getMe', {});
  }

  sendChatAction(chatId, action) {
    return this._call('sendChatAction', { chat_id: chatId, action });
  }

  setMyCommands(commands, scope) {
    return this._call('setMyCommands', { commands, scope });
  }

  setWebHook(url, options) {
    return this._call(
      'setWebhook',
      Object.assign({ url, allowed_updates: ['message', 'callback_query'] }, options),
    );
  }

  sendMessage(chatId, text, options) {
    return this._call('sendMessage', Object.assign({}, options, { chat_id: chatId, text }));
  }

  editMessageText(text, options) {
    return this._call('editMessageText', Object.assign({}, options, { text }));
  }

  sendPhoto(chatId, photo, options) {
    return this._call('sendPhoto', Object.assign({}, options, { chat_id: chatId }), {
      photo: { data: photo, filename: 'chart.png', contentType: 'image/png' },
    });
  }

  sendDocument(chatId, doc, options, fileOptions) {
    fileOptions = fileOptions || {};
    return this._call('sendDocument', Object.assign({}, options, { chat_id: chatId }), {
      document: {
        data: doc,
        filename: fileOptions.filename || 'file',
        contentType: fileOptions.contentType || 'application/octet-stream',
      },
    });
  }
}

module.exports = TelegramBot;
