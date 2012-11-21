var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');

var robot = require('../lib/robot')(require('./routes'), require('./waits'));
var weixin = require('../lib/weixin');
var messages = {
  '400': '听不懂你在说什么哦',
  '503': '服务器临时出了一点问题，您稍后再来好吗'
};

var WX_TOKEN = 'keyboardcat123';

var app = express();
app.enable('trust proxy');

var checkSig = weixin.checkSig(WX_TOKEN);

app.get('/', checkSig);
app.post('/', checkSig, weixin.bodyParser(), function(req, res, next) {
  var info = req.wx_data;

  res.type('xml');

  function end() {
    res.send(weixin.makeMessage(info));
  }

  if (!info) {
    info.reply = messages['400'];
    return end();
  }

  robot.reply(info, function(err, ret) {
    if (err || !ret) {
      //res.statusCode = (typeof err === 'number' ? err : 500);
      info.reply = ret || messages[String(err)] || messages['503'];
    } else if (ret instanceof Array) {
      info.items = ret;
    } else if (typeof ret == 'string') {
      info.reply = ret;
    } else {
      info.reply = messages['400'];
    }
    end();
  });
});
var port = process.env.PORT || 3000;
var hostname = '127.0.0.1';
app.listen(port, hostname, function() {
  log('listening on ', hostname, port);
});
