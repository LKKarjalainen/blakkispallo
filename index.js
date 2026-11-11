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
    index.js
    Main entrypoint, initialize tg-bot and then start to initialize 
    the possible web server and finally the app.
*/

'use strict';

const crypto = require('crypto');
const TOKEN = process.env.TOKEN;
const NEWRELIC = process.env.NEWRELIC === 'true';
const Bot = require('./app/lib/telegram.js');
const BOT_MODE = process.env.BOT_MODE || 'polling';
const log = require('loglevel').getLogger('system');

if (NEWRELIC) {
  // newrelic is not a dependency; install it separately to enable monitoring
  try {
    global.newrelic = require('newrelic');
  } catch (err) {
    log.warn('NEWRELIC=true but the newrelic package is not installed, continuing without it');
  }
}

if (!process.env.SECRET || process.env.SECRET.length < 16) {
  log.error('SECRET must be set and at least 16 characters long');
  process.exit(1);
}

// Setup bot
let bot;

if (BOT_MODE === 'polling') {
  // Polling needs no inbound connections at all: the preferred mode
  bot = new Bot(TOKEN, { polling: true });
} else {
  bot = new Bot(TOKEN);

  // Telegram sends this in every webhook request; anything without it is rejected.
  const secretToken =
    process.env.WEBHOOK_SECRET ||
    crypto
      .createHmac('sha256', process.env.SECRET)
      .update('telegram-webhook')
      .digest('hex');
  const path = require('./web.js')(bot, secretToken);
  bot
    .setWebHook(process.env.APP_URL.replace(/\/$/, '') + path, { secret_token: secretToken })
    .catch(err => log.error('setWebHook failed: ' + err.message));
}

// Commands addressed as /cmd@username are matched against the bot's own username
const settings = require('./app/settings.js');
if (!settings.bot_username) {
  bot
    .getMe()
    .then(me => {
      settings.bot_username = me.username.toLowerCase();
      log.info('Bot username is @' + me.username);
    })
    .catch(err => log.error('getMe failed, set BOT_USERNAME: ' + err.message));
}
if (!settings.admin_id) {
  log.warn('ADMIN_ID is not set: admin commands and error reports are disabled');
}

// Load app
require('./app/init.js')(bot);

// Fill Telegram's "/" command menu, separately for private chats and groups
const Commands = require('./app/lib/commands.js');
Promise.all([
  bot.setMyCommands(Commands.menuCommands('private'), { type: 'all_private_chats' }),
  bot.setMyCommands(Commands.menuCommands('group'), { type: 'all_group_chats' }),
])
  .then(() => log.info('Command menus updated'))
  .catch(err => log.error('setMyCommands failed: ' + err.message));

log.info('BläkkisPallo started in ' + BOT_MODE + ' mode');
