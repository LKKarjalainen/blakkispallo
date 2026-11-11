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
    /data
    Sends everything stored about the user to them as CSV files.
    Private only, so that the files can never end up in a group chat. Available
    also to users who haven't accepted the terms, as their data is still theirs.
*/
'use strict';

const Commands = require('../lib/commands.js');
const utils = require('../lib/utils.js');
const users = require('../db/users.js');
const strings = require('../strings.js');

function data(context, msg) {
  context.end();
  return users.getAllData(msg.from.id).then(tables => {
    const files = [
      { filename: 'user.csv', table: tables.user },
      { filename: 'drinks.csv', table: tables.drinks },
      { filename: 'groups.csv', table: tables.groups },
    ];
    if (files.every(file => file.table.rows.length === 0)) {
      return context.privateReply(strings.commands.data.no_data);
    }
    return files.reduce(
      (sent, file) =>
        sent.then(() =>
          context.privateDocumentReply(
            Buffer.from(utils.toCsv(file.table.columns, file.table.rows)),
            file.filename,
            'text/csv',
          ),
        ),
      context.privateReply(strings.commands.data.reply),
    );
  });
}

Commands.register(
  '/data',
  strings.commands.data.cmd_description,
  Commands.SCOPE_PRIVATE,
  Commands.PRIVILEGE_ALL,
  Commands.TYPE_SINGLE,
  data,
);
