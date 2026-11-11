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
    web.js
    Webhook endpoint for HTTPS webhook setups (like Heroku). Uses Node's
    built-in http server. Requests must carry the secret token that was
    registered with setWebhook, so only Telegram can submit updates.
*/

'use strict';
const http = require('http');
const crypto = require('crypto');
const log = require('loglevel').getLogger('system');

const MAX_BODY_BYTES = 1024 * 1024;
const WEBHOOK_PATH = '/telegram/webhook';

function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = function(bot, secretToken) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (req.method !== 'POST' || req.url !== WEBHOOK_PATH) {
      res.writeHead(404);
      return res.end();
    }
    if (!sameSecret(req.headers['x-telegram-bot-api-secret-token'] || '', secretToken)) {
      res.writeHead(401);
      return res.end();
    }
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        res.writeHead(413);
        res.end();
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (res.writableEnded) {
        return;
      }
      let update;
      try {
        update = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (err) {
        res.writeHead(400);
        return res.end();
      }
      res.writeHead(200);
      res.end();
      bot.processUpdate(update);
    });
  });
  server.requestTimeout = 10 * 1000;
  server.headersTimeout = 5 * 1000;

  // Default to loopback: put a TLS reverse proxy in front. Heroku needs HOST=0.0.0.0.
  const host = process.env.HOST || '127.0.0.1';
  server.listen(process.env.PORT || 8080, host, () => {
    const address = server.address();
    log.info('Web server started at http://%s:%s', address.address, address.port);
  });
  return WEBHOOK_PATH;
};
