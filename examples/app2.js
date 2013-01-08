var url = require('url');

var express = require('express');
var debug = require('debug');
var log = debug('wx');

//在真实环境中使用时请使用 var webot = require('weixin-robot');
var webot = require('../');
var Robot = require('../lib/robot2').Robot;
robot = new Robot()

//用文本匹配
robot.route({
  name: 'help', 
  pattern: 'help',
  // 指定如何回复
  handler: function(info, next) {
    //回传结果,直接第2个参数回复,会自动给ended和reply赋值
    next(null, 'no help');
  }
});

//用正则式匹配
robot.route({
  name: 'say_hi', 
  pattern: /^Hi/i,
  // 指定如何回复
  handler: function(info, next) {
    //回复的另一种方式,如果给传入的 request info 标记 ended,则不会进去下一个route（如果有的话）
    info.ended = true;
    info.reply = '你也好哈';
  }
});

//name相同则为重复注册,将覆盖前一个
robot.route({
  name: 'say_hi', 
  pattern: /^Hi/i,
  // 指定如何回复
  handler: function(info, next) {
    next(null, '你也好哈!!');
  }
});

//可以用函数匹配
robot.route({
  name: 'pattern_fn',
  pattern: function(info){
    return info.text == 'who'
  },
  handler: function(info, next){
    next(null, '我是猪...');
  }
})

//与waiter联动,等待下一次回复,试着发送 key nde 然后再回复Y或其他
robot.route({
  name: 'suggest_keyword',
  pattern: /^(key)\s*(.+)/i,
  handler: function(info, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    if(q == 'nde'){
      this.wait(info.from,{
        name: 'try_waiter_suggest',
        data: q,
        handler: function(next_info, next_handler){
          if(next_info.text.match(/y/i)){
            next_handler(null, '输入变更为: node');
          }else{
            next_handler(null, '仍然输入:'+ this.current.data);
          }
        }
      });
      //返回下一步动作提示
      var tip = '你输入了:' + q + '，似乎拼写错误。要我帮你更改为「node」吗?';
      return next(null, tip)
    }
  }
});

//另一种与waiter联动的方式
//试着发送 s 500 然后再回复Y或n或bye或quit
robot.route({
  name: 'search', 
  pattern: /^(搜索?|search|s\b)\s*(.+)/i,
  handler: function(info, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    var do_search = require('./support/search');

    //与waiter联动,等待下一次回复,试着发送 s 500 然后再回复Y
    var thesaurus = {
       '500': '伍佰'
    };
    if (q in thesaurus) {
      this.wait(info.from,{
        name: 'try_another_waiter',
        replies: {
          //key支持正则式
          '/^y$/i': function(next_info, next_handler){
            log('search: %s', thesaurus[q])
            do_search({ q: thesaurus[q] }, function(err, reply){
              return next_handler(null, reply);
            });
          },
          '/^n$/i': function(next_info, next_handler){
            log('search: %s', q)
            do_search({ q: q }, function(err, reply){
              return next_handler(null, reply);
            });
          },
          //key也支持纯文字,handler也可以没有callback,直接返回.
          'bye': function(next_info){
            return 'see you'
          },
          //function也支持为纯文字,直接返回
          'quit': 'ok, quit'
        }
      })
      //返回下一步动作提示
      var tip = '你尝试搜索' + q + '，但其实搜「伍佰」得到的信息会更有用一点。要我帮你搜索「伍佰」吗?';
      return next(null, tip)
    }else{
      log('seraching: ',q)
      // 从某个地方搜索到数据...
      return do_search({ q: q }, next);
    }
  }
});

//支持location消息,已经提供了geo转地址的工具，使用的是高德地图的API
//http://restapi.amap.com/rgeocode/simple?resType=json&encode=utf-8&range=3000&roadnum=0&crossnum=0&poinum=0&retvalue=1&sid=7001&region=113.24%2C23.08
robot.route({
  name: 'check_location', 
  pattern: function(info){
    return info.type == 'location'
  },
  handler: function(info, next){
    webot.geo2loc(info.param, function(loc_info) {
      next(null, loc_info ? '你正在' + loc_info['city'] : '我不知道你在什么地方。');
    });
  }
});

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
  
  log('got req msg:', info);

  //机器人根据请求提供回复
  //具体回复规则由 robot.route() 和 robot.wait() 定义
  robot.reply(info, function(err, ret) {
    log('got reply msg: %s, %s', err, ret);
    if(ret){
      if (ret instanceof Array) {
        // 在 app 层决定如何处理 robot 返回的内容
        // 如果 info.items 为一个数组，则发送图文消息
        // 否则按 info.reply 发送文字消息
        info.items = ret;
      } else if (typeof ret == 'string') {
        info.reply = ret;
      }
    }
    //返回消息,必须是XML
    res.type('xml');
    res.send(webot.makeMessage(info));
  });
});

// 图文列表的属性对应关系
// 有时候你返回给 webot.makeMessage 的 info.items 列表，
// 里面的对象并不使用标准键值，然后又不想自己用 map 处理
webot.set('article props', {
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
