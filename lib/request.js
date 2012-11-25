var https = require('https');
var http = require('http');
var url_util = require('url');

var debug = require('debug');
var log = debug('weixin');
var error = debug('weixin:request:error');

function makeReq(url, params, next) {
  var tmp = url.split(' ');
  var info = url_util.parse(tmp.pop());
  var headers;
  if (params.headers) {
    headers = params.headers;
    delete params.headers;
  }
  if (!next) {
    next = params;
    params = null;
  }
  info.query = params;

  info.protocol = info.protocol || 'http:';

  info = url_util.format(info);
  var method = tmp[0] || 'GET';
  log(method, ': ', info);
  info = url_util.parse(info);
  info.method = method;
  if (headers) info.headers = headers;

  var cb = next;
  if (next.length > 1) {
    cb = function(res) {
      var err = null;
      var bufs = [];
      if (res.statusCode !== 200) {
        error('Request failed: ', url_util.format(info), res.statusCode);
        return next(res.statusCode);
      }
      res.on('data', function(chunk) {
        bufs.push(chunk);
      });
      res.on('error', function(e) {
        err = e;
      });
      res.on('end', function(e) {
        var ret = Buffer.concat(bufs);
        if (err) return next(err, ret);
        try {
          ret = JSON.parse(ret);
        } catch (e) {}
        next(null, ret);
      });
    };
  }

  var m = (info.protocol === 'https:') ? https : http;
  return m.request(info, cb);
}

function request() {
  var req = makeReq.apply(this, arguments);
  req.end();
}

request.build = makeReq;
module.exports = request;
