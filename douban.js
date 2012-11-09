// Douban Event Api
var url_util = require('url');
var https = require('https');
var http = require('http');
var debug = require('debug');
var error = debug('wx:douban:error');
var log = debug('wx:douban:log');
var data = require('./data');
var cities = data.cities;

function request(url, params, next) {
  var tmp = url.split(' ');
  var info = url_util.parse(tmp.pop());
  info.method = tmp.length > 1 ? tmp[0] : 'GET';
  info.query = params;
  var err = null;
  var ret = '';
  var m = http;
  if (info.protocol === 'https:') m = https;
  info = url_util.format(info);
  log('Request: ', info);
  var req = m.request(info, function(res) {
    res.setEncoding('utf-8');
    if (res.statusCode !== 200) {
      error(info.protocol + ' request failed', info);
      return next(400);
    }
    res.on('data', function(chunk) {
      ret += chunk;
    });
    res.on('error', function(e) {
      err = e;
    });
    res.on('end', function(e) {
      if (err) return next(err);
      try {
        ret = JSON.parse(ret);
      } catch (e) {
        error('parse failed', ret);
        return next(500);
      }
      next(null, ret);
    });
  });
  req.end();
}
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
