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
    settings.js
    Contains all settings
*/

'use strict';

// Telegram user id of the bot admin. Unset disables admin commands and error reports.
const adminId = Number(process.env.ADMIN_ID);

module.exports = {
  log_system_level: 'info',
  log_db_level: 'info',
  log_commands_level: 'info',
  admin_id: process.env.ADMIN_ID && Number.isSafeInteger(adminId) ? adminId : null,
  // Lowercase, without '@'. If unset, index.js looks it up from Telegram at startup.
  bot_username: (process.env.BOT_USERNAME || '').replace(/^@/, '').toLowerCase() || null,
};
