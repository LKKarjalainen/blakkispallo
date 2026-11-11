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
    commands.js
    unit tests for commands.js functions
*/

/* globals describe, it, beforeEach */

'use strict';

const assert = require('assert');
const blakkistest = require('../blakkistest.js');
const mocked = blakkistest.mockMsgAndBot();
const Commands = require('../../app/lib/commands.js');
require('../../app/commands/help.js');
require('../../app/commands/komennot.js');
require('../../app/commands/start.js');
const strings = require('../../app/strings.js');
const settings = require('../../app/settings.js');

describe('commands.js', function() {
  beforeEach(blakkistest.resetDbWithTestUsersAndGroupsAndDrinks);
  describe('Commands.register()', function() {
    it('should register a command that can be called', function(done) {
      let msg = Object.assign(mocked.msg); // copy
      Commands.register(
        '/test',
        'help',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ALL,
        Commands.TYPE_SINGLE,
        context => {
          return context.privateReply('test');
        },
      );
      Commands.call('/test', msg, ['/test'])
        .then(() => {
          assert.equal(mocked.internals.sentChatId, mocked.msg.from.id);
          assert.equal(mocked.internals.sentText, 'test');
          done();
        })
        .catch(err => done(err));
    });

    it('should register a command that can be called by a valid user', function(done) {
      let msg = Object.assign(mocked.msg); // copy
      msg.from.id = blakkistest.realIds[0];
      Commands.register(
        '/testusercommand',
        'help',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_USER,
        Commands.TYPE_SINGLE,
        () => {
          done();
          return Promise.resolve();
        },
      );
      Commands.call('/testusercommand', msg, ['/testusercommand']).catch(err => done(err));
    });
  });

  describe('Commands.call()', function() {
    it('should send cmds string msg privately with /komennot', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      Commands.call('/komennot', mocked.msg, ['/komennot'])
        .then(() => {
          assert.equal(mocked.internals.sentChatId, mocked.privateId);
          assert.notEqual(
            mocked.internals.sentText.indexOf(strings.commands.blakkis.cmd_list.unformat()),
            -1,
          );
          done();
        })
        .catch(err => done(err));
    });

    it('should send help string and cmds string msg privately with /help', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      Commands.call('/help', mocked.msg, ['/help'])
        .then(() => {
          assert.equal(mocked.internals.sentChatId, mocked.privateId);
          assert.notEqual(
            mocked.internals.sentText.indexOf(strings.commands.blakkis.cmd_list.unformat()),
            -1,
          );
          assert.notEqual(
            mocked.internals.sentText.indexOf(strings.commands.blakkis.help_text.unformat()),
            -1,
          );
          done();
        })
        .catch(err => done(err));
    });

    it('a user command should not be able to be called by a non-user and a user404 string should be sent', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      mocked.msg.from.id = 0; // non user id
      Commands.register(
        '/testusercommand2',
        'help',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_USER,
        Commands.TYPE_SINGLE,
        () => {
          done(new Error('non user used a user command'));
          return Promise.resolve();
        },
      );
      Commands.call('/testusercommand2', mocked.msg, ['/testusercommand2'])
        .then(() => {
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.user404);
          done();
        })
        .catch(err => done(err));
    });

    it('a private command should not be able to be called in a chat and a private msg should not be sent if no identifier', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      Commands.register(
        '/testusercommand2',
        'help',
        Commands.SCOPE_PRIVATE,
        Commands.PRIVILEGE_USER,
        Commands.TYPE_SINGLE,
        () => {
          done(new Error('private command /testusercommand2 used in chat'));
          return Promise.resolve();
        },
      );
      mocked.msg.from.id = blakkistest.realIds[0];
      mocked.msg.chat.type = 'chat';
      mocked.msg.text = '/testusercommand2';
      Commands.rawCall(mocked.msg)
        .then(() => {
          assert.equal(mocked.internals.sentText, false);
          done();
        })
        .catch(err => done(err));
    });

    it('a chat command should not be able to be called in private and a private msg should be sent', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      mocked.msg.from.id = blakkistest.realIds[0];
      mocked.msg.chat.type = 'private';
      Commands.register(
        '/testusercommand3',
        'help',
        Commands.SCOPE_CHAT,
        Commands.PRIVILEGE_USER,
        Commands.TYPE_SINGLE,
        () => {
          done(new Error('chat command /testusercommand3 used in chat'));
          return Promise.resolve();
        },
      );
      Commands.call('/testusercommand3', mocked.msg, ['/testusercommand3'])
        .then(() => {
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.use_only_in_chats);
          done();
        })
        .catch(err => done(err));
    });

    it('an admin command should not be able to called by a non-admin and a msg is sent to the initiating user', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      mocked.msg.chat.type = 'private';
      Commands.register(
        '/admin_command',
        'help',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ADMIN,
        Commands.TYPE_SINGLE,
        () => {
          throw new Error("You shouldn't see this error");
        },
      );
      Commands.call('/admin_command', mocked.msg, ['/admin_command'])
        .then(() => {
          assert.equal(mocked.internals.sentChatId, mocked.privateId);
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.unauthorized);
          done();
        })
        .catch(err => done(err));
    });

    it('an admin command should be able to called by an admin', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      mocked.msg.chat.type = 'private';
      mocked.msg.from.id = settings.admin_id;
      Commands.register(
        '/admin_command',
        'help',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ADMIN,
        Commands.TYPE_SINGLE,
        () => done(),
      );
      Commands.call('/admin_command', mocked.msg, ['/admin_command']).catch(err => done(err));
    });

    it('should send general error if command itself is erroneous', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      Commands.register(
        '/testfail',
        '/testfail',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ALL,
        Commands.TYPE_SINGLE,
        () => {
          throw new Error('You should see this error from /testfail');
        },
      );
      Commands.call('/testfail', mocked.msg, ['/testfail'])
        .then(() => {
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.error);
          assert.equal(mocked.internals.sentChatId, mocked.msg.from.id);
          done();
        })
        .catch(err => done(err));
    });

    it('should still send general error to the user if notifying the admin fails', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      const send = mocked.bot.sendMessage;
      mocked.bot.sendMessage = (chatId, text, options) =>
        chatId === settings.admin_id
          ? Promise.reject(new Error('Forbidden: bot was blocked by the user'))
          : send(chatId, text, options);
      Commands.register(
        '/testfail2',
        '/testfail2',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ALL,
        Commands.TYPE_SINGLE,
        () => {
          throw new Error('You should see this error from /testfail2');
        },
      );
      Commands.call('/testfail2', mocked.msg, ['/testfail2'])
        .then(() => {
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.error);
          assert.equal(mocked.internals.sentChatId, mocked.msg.from.id);
          done();
        })
        .catch(err => done(err));
    });

    it('should not try to notify an admin if none is configured', function(done) {
      const mocked = blakkistest.mockMsgAndBot();
      const adminId = settings.admin_id;
      settings.admin_id = null;
      const sentTo = [];
      const send = mocked.bot.sendMessage;
      mocked.bot.sendMessage = (chatId, text, options) => {
        sentTo.push(chatId);
        return send(chatId, text, options);
      };
      Commands.register(
        '/testfail3',
        '/testfail3',
        Commands.SCOPE_ALL,
        Commands.PRIVILEGE_ALL,
        Commands.TYPE_SINGLE,
        () => {
          throw new Error('You should see this error from /testfail3');
        },
      );
      Commands.call('/testfail3', mocked.msg, ['/testfail3'])
        .then(() => {
          settings.admin_id = adminId;
          assert.deepEqual(sentTo, [mocked.msg.from.id]);
          assert.equal(mocked.internals.sentText, strings.commands.blakkis.error);
          done();
        })
        .catch(err => {
          settings.admin_id = adminId;
          done(err);
        });
    });
  });

  describe('announcements', function() {
    const pg = require('pg');
    const utils = require('../../app/lib/utils.js');
    const announcements = require('../../app/announcements.js');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const userId = blakkistest.realIds[0];
    const setRead = n =>
      pool.query('update users set read_announcements=$1 where userId=$2', [n, utils.hashSha256(userId)]);
    const getRead = () =>
      pool
        .query('select read_announcements from users where userId=$1', [utils.hashSha256(userId)])
        .then(res => res.rows[0].read_announcements);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    Commands.register('/announcetest', '/announcetest - test', Commands.SCOPE_ALL, Commands.PRIVILEGE_USER, Commands.TYPE_SINGLE, () => Promise.resolve());

    it('should show unread announcements and mark them read', function() {
      const m = blakkistest.mockMsgAndBot();
      m.msg.from.id = userId;
      return setRead(0)
        .then(() => Commands.call('/announcetest', m.msg, ['/announcetest']))
        .then(() => wait(200))
        .then(() => {
          assert.equal(m.internals.sentChatId, userId);
          assert.notEqual(m.internals.sentText.indexOf(announcements[0]), -1);
          return getRead();
        })
        .then(read => assert.equal(read, announcements.length));
    });

    it('should reset a read count above the number of announcements without showing anything', function() {
      const m = blakkistest.mockMsgAndBot();
      m.msg.from.id = userId;
      return setRead(announcements.length + 11)
        .then(() => Commands.call('/announcetest', m.msg, ['/announcetest']))
        .then(() => wait(200))
        .then(() => {
          assert.equal(m.internals.sentText, false);
          return getRead();
        })
        .then(read => assert.equal(read, announcements.length));
    });
  });

  describe('Commands.menuCommands()', function() {
    const noop = () => Promise.resolve();
    Commands.register('/menuprivate', '/menuprivate - vain yksityisesti. Lisätietoa tässä.', Commands.SCOPE_PRIVATE, Commands.PRIVILEGE_USER, Commands.TYPE_SINGLE, noop);
    Commands.register('/menugroup', '/menugroup <x> - vain ryhmissä', Commands.SCOPE_CHAT, Commands.PRIVILEGE_USER, Commands.TYPE_SINGLE, noop);
    Commands.register('/menuboth', '/menuboth - molemmissa', Commands.SCOPE_ALL, Commands.PRIVILEGE_ALL, Commands.TYPE_SINGLE, noop);
    Commands.register('/menuadmin', '/menuadmin - ylläpito', Commands.SCOPE_ALL, Commands.PRIVILEGE_ADMIN, Commands.TYPE_SINGLE, noop);
    const names = list => list.map(c => c.command);

    it('should list private and shared commands for private chats', function() {
      const list = names(Commands.menuCommands('private'));
      assert.ok(list.includes('menuprivate'));
      assert.ok(list.includes('menuboth'));
      assert.ok(!list.includes('menugroup'));
    });

    it('should list group and shared commands for groups', function() {
      const list = names(Commands.menuCommands('group'));
      assert.ok(list.includes('menugroup'));
      assert.ok(list.includes('menuboth'));
      assert.ok(!list.includes('menuprivate'));
    });

    it('should never list admin commands', function() {
      assert.ok(!names(Commands.menuCommands('private')).includes('menuadmin'));
      assert.ok(!names(Commands.menuCommands('group')).includes('menuadmin'));
    });

    it('should use the first sentence of the help text without the command prefix', function() {
      const find = (type, name) => Commands.menuCommands(type).find(c => c.command === name);
      assert.equal(find('private', 'menuprivate').description, 'Vain yksityisesti');
      assert.equal(find('group', 'menugroup').description, 'Vain ryhmissä');
    });

    it('should only produce commands Telegram accepts', function() {
      for (const type of ['private', 'group']) {
        for (const c of Commands.menuCommands(type)) {
          assert.ok(/^[a-z0-9_]{1,32}$/.test(c.command), c.command);
          assert.ok(c.description.length >= 1 && c.description.length <= 256, c.command);
        }
      }
    });
  });
});
