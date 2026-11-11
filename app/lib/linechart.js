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
    linechart.js
    Library to easily draw linecharts.
*/

'use strict';

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const log = require('loglevel').getLogger('system');

const linechart = (module.exports = {});

// One renderer for the whole process instead of one per request
const renderer = new ChartJSNodeCanvas({ width: 1024, height: 728 });

function lineChartConfig(data, title) {
  return {
    type: 'line',
    data: data,
    options: {
      elements: {
        line: {
          tension: 0.4,
        },
      },
      plugins: {
        legend: {
          labels: {
            // Prediction lines have no label; keep them out of the legend
            filter: item => Boolean(item.text),
          },
        },
        title: {
          display: true,
          text: title,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Aika',
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Promillet',
          },
        },
      },
    },
  };
}

linechart.getLineGraphBuffer = function(data, title) {
  log.debug('Trying to make a line chart from data');
  return renderer.renderToBuffer(lineChartConfig(data, title));
};
