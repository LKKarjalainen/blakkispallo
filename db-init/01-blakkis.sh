#!/bin/sh
# Runs once, on an empty data directory. Creates a non-superuser role that
# owns only the bot's database, so the bot can't read other databases or
# run programs on the server (COPY ... TO PROGRAM needs superuser).
set -eu
: "${BLAKKIS_DB_PASSWORD:?BLAKKIS_DB_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v pw="$BLAKKIS_DB_PASSWORD" <<'SQL'
create role blakkis login password :'pw' nosuperuser nocreatedb nocreaterole noinherit;
create database blakkis owner blakkis;
revoke all on database blakkis from public;
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname blakkis <<'SQL'
revoke create on schema public from public;
alter schema public owner to blakkis;
SQL

psql -v ON_ERROR_STOP=1 --username blakkis --dbname blakkis -f /schema/schema.sql
