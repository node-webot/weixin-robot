var express = require('express');
var debug = require('debug');
var log = debug('webot:example');

var _ = require('underscore')._

//在真实环境中使用时请使用 
//var WeBot = require('weixin-robot');
var WeBot = require('../');
var Robot = new WeBot.Robot();

//用文本匹配
Robot.set({
  name: 'help', 
  description: 'pattern可以用字符串匹配,试着发送「help」',
  pattern: 'help',
  //指定如何回复
  handler: function(info, action, next) {
    var i = 1;
    var reply = _.chain(Robot.get()).map(function(action){
      return (i++) + ') ' + (action.description||action.name)
    }).join('\n').value()
    next(null, '可用的指令:\n'+ reply);
  }
});

//用正则式匹配
Robot.set({
  name: 'say_hi', 
  description: 'pattern可以用正则表达式匹配,试着发送「hi」',
  pattern: /^Hi/i,
  handler: function(info) {
    //回复的另一种方式
    return '你也好哈';
  }
});

//可以用函数匹配
Robot.set({
  name: 'pattern_fn',
  description: 'pattern可以用函数匹配,试着发送「who」',
  pattern: function(info){
    return info.text == 'who'
  },
  handler: function(info, action, next){
    next(null, '我是猪...');
  }
});

//与waiter联动,等待下一次回复,试着发送 「 sex? 」 然后再回复girl或boy或both或其他
Robot.set({
  name: 'ask_sex',
  description: '与waiter联动,等待下一次回复,试着发送 「 sex? 」 然后再回复girl或boy或both或其他',
  pattern: 'sex?',
  handler: 'you guess',
  //下次回复动作,object格式,key为pattern,value为handler
  replies: {
    '/^g(irl)?\\??$/i': '猜错',
    'boy': function(info, action, next){
      return next(null, '猜对了')
    },
    'both': '对你无语...',
    //特殊的匹配,所有匹配不成功后使用它
    '*': function(info, action){
      var count = _.isNumber(action.retryCount) ? action.retryCount : 3
      if(count>1){
        //重试机制
        action.retryCount = count - 1;
        //TODO: 有BUG，这个action只是单个回复，而不是整个replies, 考虑加一个afterreplies回调
        // Robot.wait(info.from, action);
        Robot.wait(info.from, Robot.last_wait_rules);
        return '还有' + action.retryCount + '次机会,再猜.'
      }
      return "有够笨的";
    }
  }
  
  //也可以是直接的函数,同action: function(info, action, [cb]) 
  // replies: function(info, action){
  //   return 'haha, I wont tell you'
  // }

  //也可以是数组格式,每个元素为一个action
  // replies: [{
  //   pattern: '/^g(irl)?\\??$/i',
  //   handler: '猜错'
  // },{
  //   pattern: '/^b(oy)?\\??$/i',
  //   handler: '猜对了'
  // },{
  //   pattern: 'both',
  //   handler: '对你无语...'
  // }]
});

//与已有action联动,试着发送 key nde 然后再回复Y或其他
Robot.set({
  name: 'suggest_keyword',
  description: '与已有action联动,试着发送「key nde」  然后再回复Y或其他',
  pattern: /^(key)\s*(.+)/i,
  handler: function(info, action, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    if(q == 'nde'){
      //另一种replies的方式
      Robot.wait(info.from,{
        name: 'try_waiter_suggest',
        handler: function(next_info, next_action, next_handler){
          if(next_info.text.match(/y/i)){
            //next_handler(null, '输入变更为: node');
            info.text = 'nodejs'
            //调用已有的handler
            Robot.exec(info, Robot.get('search'), next_handler);
          }else{
            //next_handler(null, '仍然输入:'+ next_action.data);
            Robot.exec(info, Robot.get('search'), next_handler);
          }
        }
      });
      //返回下一步动作提示
      var tip = '你输入了:' + q + '，似乎拼写错误。要我帮你更改为「nodejs」并搜索吗?';
      return next(null, tip)
    }
    return next(null, '你输入了:' + q)
  }
});

//另一种与waiter联动的方式
//试着发送 s 500 然后再回复Y或n或bye或quit
Robot.set({
  name: 'search', 
  description: '试着发送「s 500」然后Y或N, 或者发送「s 任何关键词」',
  pattern: /^(搜索?|search|s\b)\s*(.+)/i,
  handler: function(info, action, next){
    //pattern的解析结果将放在query里
    var q = info.query[2];
    var do_search = require('./support/search');

    //与waiter联动,等待下一次回复,试着发送 s 500 然后再回复Y
    var thesaurus = {
       '500': '伍佰'
    };
    if (q in thesaurus) {
      Robot.wait(info.from,{
        //key支持正则式
        '/^y$/i': function(next_info, next_action, next_handler){
          log('search: %s', thesaurus[q])
          do_search({ q: thesaurus[q] }, function(err, reply){
            return next_handler(null, reply);
          });
        },
        '/^n$/i': function(next_info, next_action, next_handler){
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
      }, 'search')
      //返回下一步动作提示
      //TODO:改为调用handler
      var tip = '你尝试搜索' + q + '，但其实搜「伍佰」得到的信息会更有用一点。要我帮你搜索「伍佰」吗?';
      return next(null, tip)
    }else{
      log('searching: ',q)
      // 从某个地方搜索到数据...
      return do_search({ q: q }, next);
    }
  }
});

//支持location消息,已经提供了geo转地址的工具，使用的是高德地图的API
//http://restapi.amap.com/rgeocode/simple?resType=json&encode=utf-8&range=3000&roadnum=0&crossnum=0&poinum=0&retvalue=1&sid=7001&region=113.24%2C23.08
Robot.set({
  name: 'check_location', 
  description: '根据经纬度查询你的位置',
  pattern: function(info){
    return info.isLocation();
  },
  handler: function(info, action, next){
    WeBot.geo2loc(info, function(loc_info) {
      next(null, loc_info ? '你正在' + loc_info['city'] : '我不知道你在什么地方。');
    });
  }
});

//图片
Robot.set({
  name: 'check_image', 
  description: '获取用户发送的图片',
  pattern: function(info){
    return info.isImage()
  },
  handler: function(info, action, next){
    log('image url: %s', info.picUrl)
  }
});

// 你在微信公众平台填写的 token
// 测试用的微信帐号: weixin_bot
// 测试地址: webot.cloudfoundry.com
var WX_TOKEN = 'keyboardcat123';

// 启动服务
var app = express();
app.enable('trust proxy');

// 检查请求权限的 middleware
var checkSig = WeBot.checkSig(WX_TOKEN);

app.get('/', checkSig);

// 必须为 POST 请求添加 bodyParser
// parser 目前可以指定的选项有：
// {
//   'keepBlank': false // 是否保留消息头尾的空白字符，默认为 undefined
// }
app.post('/', checkSig, WeBot.bodyParser(), function(req, res, next) {
  var info = req.wx_data;
  
  log('got req msg: %j', info);

  //机器人根据请求提供回复
  //具体回复规则由 Robot.set() 和 Robot.wait() 定义
  Robot.reply(info, function(err, result) {
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
