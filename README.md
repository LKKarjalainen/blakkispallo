# BläkkisPallo

BläkkisPallo is a Telegram bot that keeps track of how drunk you are. You log your drinks and
it estimates your blood alcohol content in permilles, tells you when you'll be sober again, and
draws a chart of your evening. Add it to a group and everyone who joins in shows up in one list,
so you can see how the whole party is doing.

The bot speaks Finnish. Say hi at [@blakkispallobot](https://t.me/blakkispallobot).

BläkkisPallo is a continuation of [Bläkkisvuohi](https://gitlab.com/ultsi-projects/blakkisvuohi),
which was created and operated by Joonas Ulmanen ([@ultsi](https://t.me/ultsi)).

## Using it

Open a private chat with the bot and send `/start`. It asks for your weight, height and gender,
which it needs for the estimate, and then you can start logging drinks from the menu.

The most used commands:

| Command | What it does |
| --- | --- |
| `/start` | Main menu: your current level, drink logging and settings |
| `/promillet` | Your permilles, or everyone's in a group |
| `/kuvaaja` | Chart of the last 24 hours, with a forecast |
| `/juoma` | Log a drink |
| `/kalja033`, `/kalja05` | Quick-log a 0.33 l or 0.5 l beer |
| `/jalkikellotus` | Log drinks you forgot to log earlier |
| `/laatta` | Remove the last drink you logged |
| `/stats`, `/stats2` | Drinking statistics, by drinks or by standard drinks |
| `/annokset` | Standard drinks per person in a group over the last 48 hours |
| `/moro`, `/poistu` | Join or leave a group's lists |
| `/data` | Download everything the bot has stored about you |
| `/terms` | Terms of service and privacy policy |

`/komennot` lists every command.

In a group, each person who wants to be listed has to send `/moro` there once.

## How the estimate works

The bot uses the Widmark formula with a few refinements. Your body water factor is calculated
from your height and weight (Seidl et al.), alcohol is absorbed gradually instead of all at
once, and it is eliminated at 0.17 ‰ per hour. A standard drink is 12 grams of alcohol, as in
Finland.

It's still only an estimate. Food, drinking speed and your own metabolism all change the real
number, so never use it to decide whether you can drive.

## Privacy

The bot stores only what it needs for the estimate: weight, height, gender and the drinks you
log. Your Telegram id is stored as a hash, your nickname is encrypted, and other messages aren't
stored at all. You can download your data with `/data` and delete your account from the
settings in `/start`. The full terms are in the bot under `/terms`.

## Running your own

You need Docker, or Node.js 22 and PostgreSQL 13 or newer (17 is what the bot runs on).

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Copy `.env_docker_example` to `.env_docker` and `.env_db_example` to `.env_db`, and fill
   them in. Generate the passwords and `SECRET` with `openssl rand -hex 32`. The database
   password must be the same in both files. Set `ADMIN_ID` to your own Telegram user id if you
   want admin commands and error reports.
3. `docker compose up -d --build`

The database is created on the first start. It is only reachable from the bot's container, and
both containers run as unprivileged users with read-only filesystems.

Keep `SECRET` safe and don't change it later: it encrypts the stored nicknames, and changing it
makes them unreadable.

The bot uses polling by default, so it needs no open ports. If you'd rather use a webhook, set
`BOT_MODE=webhook` and `APP_URL` to a public HTTPS address in front of the bot. Telegram then
posts updates to `$APP_URL/telegram/webhook`. The server listens on `127.0.0.1` unless you set
`HOST`.

### Moving data from Bläkkisvuohi 4.0.x

1. Dump the old database with `pg_dump --data-only --table='users*' --table=groups` and restore
   it into the new `blakkis` database as the `blakkis` user.
2. Use the old installation's `SECRET`, then run `npm run reencrypt` once to move the stored
   nicknames to the new encryption format.
3. Run `update users set read_announcements = 0;` so returning users see the BläkkisPallo
   welcome announcement, which points them to the new terms.

## Development

`npm test` runs the tests. They need a PostgreSQL database in `DATABASE_URL`; create the tables
with `node setup_test_db.js`. See [CHANGELOG.md](CHANGELOG.md) for what changed in 5.0.

## Credits

Bläkkisvuohi was created by Joonas Ulmanen ([@ultsi](https://t.me/ultsi)). Most of the bot, from
the drink tracking to the alcohol math, is his work.

BläkkisPallo is maintained by [@LKKarjalainen](https://t.me/LKKarjalainen).

## License

GPLv3. See [LICENSE](LICENSE).
