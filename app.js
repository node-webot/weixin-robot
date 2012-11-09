var crypto = require('crypto');
var url = require('url');

var express = require('express');
var debug = require('debug')('wx:error');

var conf = require('./config');
var douban = require('./douban');
var weixin = require('./weixin');

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
      debug('request douban failed: ', err, ', ret: ',  ret);
      return res.json(err);
    }

    info.douban_ret = ret;

    var msg;
    try {
      msg = weixin.makeMsg(info)
    } catch (e) {
      debug('make message failed:', e, info);
      return halt_req(res);
    }
    res.type('xml');
    res.send(msg);
  });
});
app.configure('vps', function() {
  app.set('listening', 2012);
});
app.listen(app.get('listening') || process.env.PORT || 3000);

function check_sig(req, res, next) {
  var sig = req.params.signature;
  var timestamp = req.params.timestamp;
  var nonce = req.params.nonce;
  var s = [WX_TOKEN, timestamp, nonce].sort().join('');
  var shasum = crypto.createHash('sha1');
  shasum.update(s);
  if (shasum.digest('hex') == sig) {
    res.send(echostr);
    next();
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
      debug('parse request failed');
      return halt_req(res);
    }
    next();
  });
}
