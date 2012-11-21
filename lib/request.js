var https = require('https');
var http = require('http');
var url_util = require('url');

var debug = require('debug');
var log = debug('weixin');
var error = debug('weixin:request:error');

function makeReq(url, params, next) {
  var tmp = url.split(' ');
  var info = url_util.parse(tmp.pop());
  if (!next) {
    next = params;
    params = null;
  }
  info.query = params;

  var m = (info.protocol === 'https:') ? https : http;

  info.protocol = info.protocol || 'http:';

  if (params.headers) {
    info.headers = params.headers;
    delete params['headers'];
  }

  info = url_util.format(info);
  var method = tmp[0] || 'GET';
  log(method, ': ', info);
  info = url_util.parse(info);
  info.method = method;

  var cb = next;
  if (next.length > 1) {
    cb = function(res) {
      var err = null;
      var ret = '';
      if (res.statusCode !== 200) {
        error('Request failed: ', url_util.format(info), res.statusCode);
        return next(res.statusCode);
      }
      res.on('data', function(chunk) {
        ret += chunk;
      });
      res.on('error', function(e) {
        err = e;
      });
      res.on('end', function(e) {
        if (err) return next(err, ret);
        try {
          ret = JSON.parse(ret);
        } catch (e) {}
        next(null, ret);
      });
    };
  }

  return m.request(info, cb);
}

function request() {
  var req = makeReq.apply(this, arguments);
  req.end();
}

request.build = makeReq;
module.exports = request;
