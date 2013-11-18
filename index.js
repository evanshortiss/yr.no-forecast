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
 * @constructor
 * @param {String}    xml
 * @param {Function}  callback
 */

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
   * Get five day weather.
   * @param {Function} callback
   */
  getFiveDaySummary: function(callback) {
    var self = this;
    var fns = [];
    // Use miday for forecast
    var curDate = moment.utc().hours(12);
    curDate.set('minutes', 0);

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

    getBasicForTime(time, self.basic, function(err, basic) {
      if (!basic) {
        return callback(null, {});
      }

      getDetailForTime(time, self.detail, function(err, detail) {
        if (detail) {
          return callback(null, buildDetail(detail, basic));
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


/**
 * Build the detailed info for forecast object.
 * @param {Object} detail
 * @param {Object} obj
 */

function buildDetail(detail, basic) {
  // <location altitude="48" latitude="59.3758" longitude="10.7814">
  //   <temperature id="TTT" unit="celcius" value="6.3"/>
  //   <windDirection id="dd" deg="223.7" name="SW"/>
  //   <windSpeed id="ff" mps="4.2" beaufort="3" name="Lett bris"/>
  //   <humidity value="87.1" unit="percent"/>
  //   <pressure id="pr" unit="hPa" value="1010.5"/>
  //   <cloudiness id="NN" percent="0.0"/>
  //   <fog id="FOG" percent="0.0"/>
  //   <lowClouds id="LOW" percent="0.0"/>
  //   <mediumClouds id="MEDIUM" percent="0.0"/>
  //   <highClouds id="HIGH" percent="0.0"/>
  //   <dewpointTemperature id="TD" unit="celcius" value="4.2"/>
  // </location>

  var obj = {
    icon: basic['location']['symbol']['id'],
    to: basic['to'],
    from: basic['from'],
    rain: (basic['location']['precipitation']['value'] + ' ' + basic['location']['precipitation']['unit'])
  };

  // Corresponds to XML 'location' element
  var location = detail.location;
  var cur = null;
  for (var key in location) {
    cur = location[key];

    // Based on field type build the response
    // Type 1: Has "value" and "unit", combine for result
    // Type 2: Has only "percent"
    // Type 3: Has multiple properties where the name is the value
    if (cur.hasOwnProperty('value')) {
      obj[key] = cur['value'] + ' ' + cur['unit'];
    } else if (cur.hasOwnProperty('percent')) {
      obj[key] = cur['percent'] + '%';
    } else if (typeof cur === 'object') {
      obj[key] = {};
      for (var nestedKey in cur) {
        if (nestedKey != 'id') {
          obj[key][nestedKey] = cur[nestedKey];
        }
      }
    }
  }

  return obj;
}


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


/**
 * Used when no matching element is found for a time of a day.
 * @param   {Date}      time
 * @param   {Array}     collection
 * @param   {Function}  callback
 */
function fallbackSelector(time, collection, callback) {
  time = moment(time);

  // Find out is time before or after collection range
  var isBefore = false;
  async.each(collection, function(item, cb) {
    if(time.isBefore(moment(item.to))) {
      isBefore = true;
      return cb(true);
    }

    cb();
  }, function() {
    // Take earlist time possbile
    if(isBefore == true) {
      return callback(null, collection[0]);
    }

    // Take latest time possible
    return callback(null, collection[collection.length-1]);
  });
}


/**
 * Get detailed items for a time.
 * Find nearest hour on same day, or no result.
 * @param {String|Object}
 * @param {Function}
 */

function getDetailForTime(date, detail, callback) {
  date = moment.utc(date);

  // Used to find closest time to one provided
  var maxDifference = Infinity;
  var res = null;

  // Get any detail items for the date
  getItemsForDay(detail, date, function(err, items) {
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
      if(res == null) {
        return fallbackSelector(date, detail, callback);
      }

      return callback(null, res);
    });
  });
}


/**
 * Get basic items for a time.
 * Find nearest hour on same day, or no result.
 * @param {String|Object}
 * @param {Function}
 */

function getBasicForTime(date, basic, callback) {
  date = moment.utc(date);

  // Used to find closest time to one provided
  var maxDifference = Infinity;
  var res = null;

  // Variables used in loop
  var to, from;

  // Get any detail items for the date
  getItemsForDay(basic, date, function(err, items) {
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
      if(res == null) {
        return fallbackSelector(date, basic, callback);
      }

      return callback(null, res);
    });
  });
}


/**
 * Provides detailed forecasts for a given date.
 * @param {Array}         collection
 * @param {String|Object} date
 * @param {Function}      callback
 */

function getItemsForDay(collection, date, callback) {
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
}