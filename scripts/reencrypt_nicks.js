/*
    One-off migration: rewrites nicks stored in the legacy aes192 format
    in the authenticated AES-256-GCM format. Safe to run repeatedly.
*/
'use strict';
const pg = require('pg');
const utils = require('../app/lib/utils.js');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const res = await client.query('select userId, nick from users for update');
    let changed = 0;
    for (const row of res.rows) {
      if (utils.isLegacyEncrypted(row.nick)) {
        const nick = utils.encrypt(utils.decrypt(row.nick));
        await client.query('update users set nick=$1 where userId=$2', [nick, row.userid]);
        changed++;
      }
    }
    await client.query('commit');
    console.log(`Re-encrypted ${changed} of ${res.rows.length} nicks`);
  } catch (err) {
    await client.query('rollback');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
