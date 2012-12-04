var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');

var robot = require('../lib/robot')(require('./routes'), require('./waits'));
var webot = require('../lib/weixin');

// 不建议在正式环境中这样用
// 请安装 npm package `weixin-robot`，
// 然后：
//  var webot = require('weixin-robot');
//  var router = webot.router();
//  var waiter = webot.waiter();
//  var robot = webot.robot(router, waiter);

var messages = {
  '400': '听不懂你在说什么哦',
  '503': '服务器临时出了一点问题，您稍后再来好吗'
};

// 你在微信公众平台填写的 token
var WX_TOKEN = 'keyboardcat123';

// 启动服务
var app = express();
app.enable('trust proxy');

// 检查请求权限的 middleware
var checkSig = webot.checkSig(WX_TOKEN);

app.get('/', checkSig);

// 必须为 POST 请求添加 bodyParser
// parser 目前可以指定的选项有：
// {
//   'keepBlank': false // 是否保留消息头尾的空白字符，默认为 undefined
// }
app.post('/', checkSig, webot.bodyParser(), function(req, res, next) {
  var info = req.wx_data;

  // 返回给微信的，必须是一个 xml
  res.type('xml');

  function end() {
    // 返回消息
    // 如果 info.items 为一个数组，则发送图文消息
    // 否则按 info.reply 发送文字消息
    res.send(webot.makeMessage(info));
  }

  if (!info) {
    info.reply = messages['400'];
    return end();
  }

  // 机器人根据请求提供回复
  robot.reply(info, function(err, ret) {
    if (err || !ret) {
      // 出错信息
      //res.statusCode = (typeof err === 'number' ? err : 500);
      info.reply = ret || messages[String(err)] || messages['503'];
    } else if (ret instanceof Array) {
      // 在 app 层决定如何处理 robot 返回的内容
      info.items = ret;
    } else if (typeof ret == 'string') {
      info.reply = ret;
    } else {
      info.reply = messages['400'];
    }
    end();
  });
});

// 图文列表的属性对应关系
// 有时候你返回给 webot.makeMessage 的 items 列表，
// 里面的对象并不使用标准键值，然后又不想自己用 map 处理
webot.set('article props', {
  'pic': 'image',
  'url': 'uri',
  'desc': 'description',
});


var port = process.env.PORT || 3000;
var hostname = '127.0.0.1';
app.listen(port, hostname, function() {
  log('listening on ', hostname, port);
});
