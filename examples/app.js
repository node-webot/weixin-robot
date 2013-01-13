var debug = require('debug');
var log = debug('webot:example');

var express = require('express');
var _ = require('underscore')._

//在真实环境中使用时请使用 
//var WeBot = require('weixin-robot');
var WeBot = require('../');
var robot = new WeBot.Robot();

//载入路由规则
var rules = require('./rules.js');
rules.init(robot);

// 你在微信公众平台填写的 token
// 公众号名称: webot
// 微信号: weixin_bot
// 测试地址: webot.cloudfoundry.com
var WX_TOKEN = 'keyboardcat123';

// 启动服务
var app = express();
app.enable('trust proxy');

// 检查请求权限的 middleware
var checkSig = WeBot.checkSig(WX_TOKEN);

app.get('/', checkSig);

// 必须为 POST 请求添加 bodyParser
app.post('/', checkSig, WeBot.bodyParser(), function(req, res, next) {
  var info = req.wx_data;
  
  log('got req msg: %j', info);

  //机器人根据请求提供回复
  //具体回复规则由 robot.set() 和 robot.wait() 定义
  robot.reply(info, function(err, result) {
    log('got reply msg: %s, %s', err, result);
    if(err){
      info.reply = WeBot.STATUS_MSG[String(err)] || WeBot.STATUS_MSG['500']
    }else{
      info.reply = result || WeBot.STATUS_MSG['404'] ;
    }
    //返回消息,必须是XML
    res.type('xml');
    res.send(info.toXML());
  });
});

// 图文列表的属性对应关系
// 有时候你返回给 WeBot.makeMessage 的 info.items 列表，
// 里面的对象并不使用标准键值，然后又不想自己用 map 处理
WeBot.set('article props', {
  'pic': 'image',
  'url': 'uri',
  'desc': 'description',
});


var port = process.env.PORT || 3000;
var hostname = '127.0.0.1';

// 微信后台只允许 80 端口，你可能需要自己做一层 proxy
app.listen(port, hostname, function() {
  log('listening on ', hostname, port);
});
