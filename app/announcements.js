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

'use strict';

/*
    Announcements are shown once, on the user's next command after they are added.
    Each user stores how many they have read, so only ever append to the end.
    New users start with all existing announcements marked as read.

    The original Bläkkisvuohi announcements (2018-2026) were removed when the bot
    continued as BläkkisPallo; they are in the original repository's history.
*/
module.exports = [
  '11.11.2026\n\nBläkkisvuohi jatkaa nimellä BläkkisPallo! Bottia ylläpitää nyt @LKKarjalainen, ja se perustuu Joonas Ulmasen (@ultsi) kehittämään Bläkkisvuoheen. Kiitos, Joonas!\n\nKäyttöehdot ja tietosuojaseloste on uudistettu. Lue ne komennolla /terms.',
];
