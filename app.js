var crypto = require('crypto');
var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');
var error = debug('wx:error');

var conf = require('./lib/config');
var douban = require('./lib/douban');
var weixin = require('./lib/weixin');

var WX_TOKEN = conf.weixin;

var app = express();
app.enable('trust proxy');

app.get('/', check_sig);
app.post('/', parse_body, function(req, res, next) {
  var info = req.info;
  douban[info.act](info.param, function(err, ret) {
    if (err == 400) return halt_req(res);
    if (err) {
      res.statusCode = 500;
      error('request douban failed: ', err, ', ret: ',  ret);
      return res.json(err);
    }

    info.douban_ret = ret;

    var msg;
    try {
      msg = weixin.makeMsg(info)
    } catch (e) {
      error('make message failed:', e, info);
      return halt_req(res);
    }
    res.type('xml');
    res.send(msg);
  });
});
app.configure('vps', function() {
  app.set('listening', 2012);
});
var port = app.get('listening') || process.env.PORT || 3000;
log('listening on ', port);
app.listen(port);

function check_sig(req, res, next) {
  var sig = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var s = [WX_TOKEN, timestamp, nonce].sort().join('');
  var shasum = crypto.createHash('sha1');
  shasum.update(s);
  var dig = shasum.digest('hex');
  if (dig == sig) {
    return res.send(req.query.echostr);
  }
  return halt_req(res);
}

function halt_req(res) {
  return res.json({ 'r': 400, 'msg': 'bad request' });
}

function parse_body(req, res, next) {
  var b = '';
  req.setEncoding('utf-8');
  req.on('data', function(data) {
    b += data;
  });
  req.on('end', function() {
    req.info = weixin.parse(b);
    if (!req.info) {
      error('parse request failed');
      return halt_req(res);
    }
    next();
  });
}
