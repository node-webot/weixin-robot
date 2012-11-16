var crypto = require('crypto');
var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');
var error = debug('wx:error');

var robot = require('./lib/robot')(require('./rules/routes'), require('./rules/waits'));
var weixin = require('./lib/weixin');
var conf = require('./conf');
var data = require('./data');
var messages = data.messages;

var WX_TOKEN = conf.weixin;

var app = express();
app.enable('trust proxy');

app.get('/', check_sig);
app.post('/', check_sig, parse_body, function(req, res, next) {
  var info = req.info;

  res.type('xml');

  function end() {
    res.send(weixin.makeMsg(info));
  }

  if (!info) {
    info.reply = messages['400'];
    return end();
  }

  robot.reply(info, function(err, ret) {
    if (err || !ret) {
      //res.statusCode = (typeof err === 'number' ? err : 500);
      info.reply = ret || messages[String(err)] || messages['503'];
      return end();
    }
    if (ret instanceof Array) {
      info.items = ret;
    } else if (typeof ret == 'string') {
      info.reply = ret;
    } else {
      info.reply = messages['400'];
    }
    end();
  });
});
var port = conf.port || 3000;
var hostname = conf.hostname || '127.0.0.1';
app.listen(port, hostname, function() {
  log('listening on ', hostname, port);
});

function check_sig(req, res, next) {
  var sig = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var s = [WX_TOKEN, timestamp, nonce].sort().join('');
  var shasum = crypto.createHash('sha1');
  shasum.update(s);
  var dig = shasum.digest('hex');
  if (dig == sig) {
    if (req.method == 'GET') {
      return res.send(req.query.echostr);
    } else {
      return next();
    }
  }
  return block_req(res);
}

function block_req(res) {
  res.statusCode = 403;
  return res.json({ 'r': 403, 'msg': 'Where is your key?' });
}

function parse_body(req, res, next) {
  var b = '';
  req.setEncoding('utf-8');
  req.on('data', function(data) {
    b += data;
  });
  req.on('end', function() {
    req.info = weixin.parse(b);
    next();
  });
}
