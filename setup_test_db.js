/*
    Bläkkisvuohi, a Telegram bot to help track estimated blood alcohol concentration.
    Copyright (C) 2017-2018 Joonas Ulmanen

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
    init_test_db.js
    Initialize test database
*/

const pg = require('pg');
const fs = require('fs');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

fs.readFile('app/schema.sql', (err, data) => {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  const sql = data.toString();
  pool
    .query(sql)
    .then(() => {
      console.log('Database set up');
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(-1);
    });
});
