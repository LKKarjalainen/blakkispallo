# Changelog

## 5.0.0

Breaking changes; see "Upgrading from 4.0.x" in the README.

- Requires Node.js 22+ and PostgreSQL 13+ (17 recommended).
- Nicks are encrypted with authenticated AES-256-GCM. Old values stay readable;
  `npm run reencrypt` rewrites them in the new format.
- `SECRET` must be at least 16 characters.
- Replaced `node-telegram-bot-api` with a small built-in client using `fetch`.
  Polling is the default mode.
- Webhook mode checks Telegram's secret token header, limits body size and
  listens on `127.0.0.1` unless `HOST` is set.
- New hardened Docker Compose setup: internal-only database network, a limited
  `blakkis` database role, non-root read-only containers and resource limits.
  The bot waits for the database healthcheck before starting.
- New Relic is optional: install `newrelic` separately to use `NEWRELIC=true`.
- Rewrote the terms of service and privacy policy (`/terms`) for BläkkisPallo,
  maintained by @LKKarjalainen, and updated `/about` to credit the original author.
- Help texts point to the new maintainer, and the privacy help matches `/terms`.
- Replaced the old Bläkkisvuohi announcements with one welcome announcement for
  returning users. Read counts above the number of announcements are reset.
