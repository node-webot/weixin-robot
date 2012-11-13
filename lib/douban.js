// Douban Event Api
var request = require('./request');
var data = require('./data');
var cities = data.cities;

var debug = require('debug');
var log = debug('wx:douban');
var error = debug('wx:douban:error');

module.exports = {
  'events_list': function(params, next) {
    request('GET https://api.douban.com/v2/event/list', params, next);
  },
  'nearby': function(params, next) {
    var cb = function() {
      request('GET https://api.douban.com/v2/event/nearby', params, next);
    };
    // Find city id by latlng
    if (!params.loc) {
      request('GET http://api.amap.com:9090/rgeocode/simple', {
        resType: 'json',
        encode: 'utf-8',
        range: 3000,
        roadnum: 3,
        crossnum: 2,
        poinum: 1,
        retvalue: 1,
        sid: 7001,
        region: [params.lng, params.lat].join(',')
      }, function(err, ret) {
        try {
          var loc_name = ret.list[0].city.name || ret.list[0].province.name;
          log('latlng to loc_name: ', loc_name);
          for (var i in cities) {
            var item = cities[i];
            if (loc_name.indexOf(item['name']) === 0) {
              params.loc = item['id'];
              break;
            }
          }
        } catch (e) {
          error('geo to loc failed', e);
        }
        cb();
      });
    } else {
      cb();
    }
  }
};
