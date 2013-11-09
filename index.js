// Copyright 2013 Evan Shortiss
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

module.exports = {
  getWeather: getWeather
};

var yrno = require('yr.no-interface'),
  moment = require('moment'),
  async = require('async'),
  xml2js = require('xml2js');

/**
 * Public call to easily get weather object.
 * @param {Object}    params
 * @param {Callback}  callback
 * @param {String}    version
 */

function getWeather(params, callback, version) {
  // Make a standard call to the API
  yrno.locationforecast(params, function(err, body) {
    if (err) {
      return callback(err, null);
    }

    // Wrap the response from API
    new LocationForecast(body, callback);
  }, version);
}


function LocationForecast(xml, callback) {
  this.xml = xml;
  this.basic = [];
  this.detail = [];

  // Parse to JSON and return this object on success
  var self = this;
  new xml2js.Parser({
    async: true,
    mergeAttrs: true,
    explicitArray: false
  }).parseString(xml, function(err, json) {
    if (err) {
      return callback('Failed to parse yr.no xml to json', null);
    }
    self.json = json;
    self._init(callback);
  });
}

LocationForecast.prototype = {
  _init: function(callback) {
    var self = this;

    var json = this.json;
    var current = json['weatherdata']['product']['time'][0];
    current.symbol = json['weatherdata']['product']['time'][1]['symbol'];

    async.forEach(json['weatherdata']['product']['time'], function(time, cb) {
      // Forecast data with a symbol is a basic summary
      if (time['location']['symbol']) {
        self.basic.push(time);
      } else {
        self.detail.push(time);
      }
      cb();
    }, function() {
      return callback(null, self);
    });
  },


  /**
   * Return JSON of weather
   */
  getJson: function() {
    return this.json;
  },


  /**
   * Return XML of weather
   */
  getXml: function() {
    return this.xml;
  },


  /**
   * Provides detailed forecasts for a given date.
   * @param {Array}         collection
   * @param {String|Object} date
   * @param {Function}      callback
   */
  _getItemsForDay: function(collection, date, callback) {
    date = moment.utc(date);

    var res = [];
    async.each(collection, function(item, cb) {
      if (moment.utc(item.from).isSame(date, 'day') || moment.utc(item.to).isSame(date, 'day')) {
        res.push(item);
      }
      cb();
    }, function(err) {
      return callback(null, res);
    });
  },


  /**
   * Get detailed items for a time.
   * Find nearest hour on same day, or no result.
   * @param {String|Object}
   * @param {Function}
   */
  _getDetailForTime: function(date, callback) {
    date = moment.utc(date);

    // Used to find closest time to one provided
    var maxDifference = Infinity;
    var res = null;

    // Get any detail items for the date
    this._getItemsForDay(this.detail, date, function(err, items) {
      // Find the one closest to our time
      async.each(items, function(item, cb) {
        // Only look at 'to' as it and 'from' are same
        var diff = Math.abs(moment.utc(item.to).diff(date));
        if (diff < maxDifference) {
          maxDifference = diff;
          res = item;
        }
        cb();
      }, function() {
        return callback(null, res);
      });
    });
  },


  /**
   * Get basic items for a time.
   * Find nearest hour on same day, or no result.
   * @param {String|Object}
   * @param {Function}
   */
  _getBasicForTime: function(date, callback) {
    date = moment.utc(date);

    // Used to find closest time to one provided
    var maxDifference = Infinity;
    var res = null;

    // Variables used in loop
    var to, from;

    // Get any detail items for the date
    this._getItemsForDay(this.basic, date, function(err, items) {
      // Find times that have small range 'from' to 'to'
      // That our provided time falls between
      async.each(items, function(item, cb) {
        to = moment.utc(item.to);
        from = moment.utc(item.from);

        // Check the date falls in range
        if ((from.isSame(date) || from.isBefore(date)) && (to.isSame(date) || to.isAfter(date))) {
          var diff = Math.abs(to.diff(from));
          if (diff < maxDifference) {
            maxDifference = diff;
            res = item;
          }
        }
        cb();
      }, function() {
        return callback(null, res);
      });
    });
  },


  /**
   * Get five day weather.
   * @param {Function} callback
   */
  getFiveDaySummary: function(callback) {
    var self = this;
    var fns = [];
    // Use miday for forecast
    var curDate = moment.utc();

    // Create 5 days of dates
    for (var i = 0; i < 5; i++) {
      // Avoid scope error for wrong day reference
      (function() {
        var day = curDate.clone();
        day = day.add('days', i);
        fns.push(function(cb) {
          self.getForecastForTime(day, function(err, weather) {
            if (err) {
              return cb(err, null);
            }

            return cb(null, weather);
          })
        });
      })()
    }

    // Run tasks and return weather array
    async.series(fns, function(err, res) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, res);
    });
  },


  /**
   * Returns a forecast for a given time.
   * @param {String|Date} time
   * @param {Function}    callback
   */
  getForecastForTime: function(time, callback) {
    var self = this;

    time = moment.utc(time);
    if (time.isValid() === false) {
      return callback('Invalid date provided for weather lookup. Date: ' + time);
    }

    this._getBasicForTime(time, function(err, basic) {
      if (!basic) {
        return callback('No weather basic for time ' + time.toJSON(), null);
      }

      var res = {
        icon: basic['location']['symbol']['id'],
        to: basic['to'],
        from: basic['from'],
        rain: (basic['location']['precipitation']['value'] + ' ' + basic['location']['precipitation']['unit'])
      };

      self._getDetailForTime(time, function(err, detail) {
        if (detail) {
          // Build response
          res.temperature = detail['location']['temperature']['value'];
          res.windSpeed = detail['location']['windSpeed']['mps'] + 'm/s';
          res.windBearing = detail['location']['windDirection']['deg'];
          res.beaufort = detail['location']['windSpeed']['beaufort'];
          res.cloudCover = detail['location']['cloudiness']['percent'];
          res.humidity = detail['location']['humidity']['value'] + '%';
          res.pressure = detail['location']['pressure']['value'] + ' ' + detail['location']['pressure']['unit'];
        }
        return callback(null, res);
      });
    });
  },


  /**
   * Get basic summary for current time.
   * @param {Function} callback
   */
  getCurrentSummary: function(callback) {
    this.getForecastForTime(Date.now(), callback);
  },
};