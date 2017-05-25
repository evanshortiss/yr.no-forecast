'use strict';

const log = require('debug')(require('./package.json').name);
const moment = require('moment');
const XML = require('pixl-xml');
const VError = require('verror');
const each = require('lodash.foreach');
const Promise = require('bluebird');

/**
 * "simple" nodes are those with very basic detail. 1 to 4 of these follow a
 * node with more details
 * @param  {Object}  node
 * @return {Boolean}
 */
function isSimpleNode (node) {
  return node.location.symbol !== undefined;
}

/**
 * Check if a node has a min and max temp range
 * @param  {Object}  node
 * @return {Boolean}
 */
function hasTemperatureRange (node) {
  return node.location.minTemperature && node.location.maxTemperature;
}

/**
 * Convert a momentjs date object into an ISO string compatible with our XML
 * @param  {Date}   date
 * @return {String}
 */
function dateToForecastISO (date) {
  return date.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}

module.exports = (config) => {
  // Make a default config, but extend it with the passed config
  config = Object.assign({
    version: 1.9
  }, config);

  // Create a yrno instance with any overrides required
  const yrno = require('yr.no-interface')({
    request: config.request
  });

  return {
    /**
     * Public call to get a LocationForecast instance.
     * Version is optional.
     * @param {Object}    params
     * @param {String}    [version]
     */

    getWeather: (params, version) => {
      version = version || config.version;

      log('requesting a locationforecast using API version %s', version);

      return Promise.fromCallback(function (callback) {
        // Make a standard call to the API
        yrno.locationforecast({
          query: params,
          version: version
        }, function(err, body) {
          if (err) {
            log('failed to get locationforecast from yr.no API. Error:', err);
            return callback(err, null);
          }


          log('successfully retrieved locationforecast report from yr.no');

          // Wrap the response from API
          callback(null, new LocationForecast(body));
        });
      });
    }

  };
};

/**
 * @constructor
 * @param {String} xml
 */
function LocationForecast(xml) {
  this.xml = xml;

  // Map containing weather info for given utc times
  this.times = {
    // e.g '2017-04-29T01:00:00Z': { DATA HERE }
  };

  log('building LocationForecast object by parsing xml to JSON');

  var startDt = Date.now();

  // Parse to JSON and return this object on success
  try {
    this.json = XML.parse(xml, {preserveDocumentNode: true});
    log('parsing xml to json took %dms', Date.now() - startDt);
  } catch (e) {
    throw new VError(e, 'failed to parse returned xml string to JSON');
  }

  this._init();

  log('LocationForecast init complete in %sms', Date.now() - startDt);

  return this;
}

LocationForecast.prototype = {
  _init: function () {
    var self = this;

    each(this.json.weatherdata.product.time, function (node) {
      const simple = isSimpleNode(node);
      const temps = hasTemperatureRange(node);

      if (!simple) {
        self.times[node.to] = node;
      } else {
        // node is a small/simple node with format
        // <time datatype="forecast" from="2017-04-28T22:00:00Z" to="2017-04-28T23:00:00Z">
        //   <location altitude="17" latitude="34.0522" longitude="118.2437">
        //     <precipitation unit="mm" value="0.0"/>
        //     <symbol id="Sun" number="1"/>
        //   </location>
        // </time>

        const parent = self.times[node.to];

        parent.icon = node.location.symbol.id;
        parent.rain = node.location.precipitation.value + ' ' + node.location.precipitation.unit;

        /* istanbul ignore else  */
        if (temps) {
          parent.minTemperature = node.location.minTemperature;
          parent.maxTemperature = node.location.maxTemperature;
        }
      }
    });
  },


  /**
   * Returns the JSON representation of the parsed XML`
   * @return {Object}
   */
  getJson: function() {
    return this.json;
  },


  /**
   * Return the XML string that the met.no api returned
   * @return {String}
   */
  getXml: function() {
    return this.xml;
  },


  /**
   * Returns the earliest ISO timestring available in the weather data
   * @return {String}
   */
  getFirstDateInPayload: function () {
    return this.json.weatherdata.product.time[0].from;
  },


  /**
   * Returns the latest ISO timestring available in the weather data
   * @return {String}
   */
  getLastDateInPayload: function () {
    return this.json.weatherdata.product.time[this.json.weatherdata.product.time.length - 1].from;
  },


  /**
   * Returns an array of all times that we have weather data for
   * @return {Array<String>}
   */
  getValidTimestamps: function () {
    return Object.keys(this.times);
  },


  /**
   * Get five day weather.
   * @param {Function} callback
   */
  getFiveDaySummary: function() {
    const startDate = moment.utc(this.getFirstDateInPayload());
    const baseDate = startDate.clone().set('hour', 12).startOf('hour');
    let firstDate = baseDate.clone();

    log(`five day summary is using ${baseDate.toString()} as a starting point`);

    /* istanbul ignore else  */
    if (firstDate.isBefore(startDate)) {
      // first date is unique since we may not have data back to midday so instead we
      // go with the earliest available
      firstDate = startDate.clone();
    }

    log(`getting five day summary starting with ${firstDate.toISOString()}`);

    return Promise.all([
      this.getForecastForTime(firstDate),
      this.getForecastForTime(baseDate.clone().add(1, 'days')),
      this.getForecastForTime(baseDate.clone().add(2, 'days')),
      this.getForecastForTime(baseDate.clone().add(3, 'days')),
      this.getForecastForTime(baseDate.clone().add(4, 'days'))
    ])
      .then(function (results) {
        // Return a single array of objects
        return Array.prototype.concat.apply([], results);
      });
  },


  /**
   * Verifies if the pased timestamp is a within range for the weather data
   * @param  {String|Number|Date}  time
   * @return {Boolean}
   */
  isInRange: function (time) {
    return moment.utc(time)
      .isBetween(
        moment(this.getFirstDateInPayload()),
        moment(this.getLastDateInPayload())
      );
  },


  /**
   * Returns a forecast for a given time.
   * @param {String|Date} time
   * @param {Function}    callback
   */
  getForecastForTime: function (time) {
    time = moment.utc(time);

    if (time.isValid() === false) {
      return Promise.reject(
        new Error('Invalid date provided for weather lookup')
      );
    }

    if (time.minute() > 30) {
      time.add('hours', 1).startOf('hour');
    } else {
      time.startOf('hour');
    }

    log('getForecastForTime', dateToForecastISO(time));

    let data = this.times[dateToForecastISO(time)] || null;

    /* istanbul ignore else  */
    if (!data && this.isInRange(time)) {
      data = this.fallbackSelector(time);
    }

    /* istanbul ignore else  */
    if (data) {
      data = Object.assign({}, data, data.location);
      delete data.location;
    }

    return Promise.resolve(data);
  },


  fallbackSelector: function (date) {
    log('using fallbackSelector for date', date);

    const datetimes = Object.keys(this.times);

    let closest = null;
    let curnode, curTo;
    let len = datetimes.length - 1;

    while (len) {
      curnode = this.times[datetimes[len]];
      curTo = moment(curnode.to);

      if (date.isSame(curTo, 'day')) {
        if (!closest) {
          closest = curnode;
        } else {
          /* istanbul ignore else  */
          if (Math.abs(date.diff(curTo)) < Math.abs(date.diff(moment(closest.to)))) {
            closest = curnode;
          }
        }
      } else if (closest) {
        // we found a node, and no more nodes exist for the day we need...BAIL
        break;
      }

      len--;
    }

    return closest;
  }
};
