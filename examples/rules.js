var debug = require('debug');
var log = debug('webot:example');

var _ = require('underscore')._
var search = require('./support').search
var geo2loc = require('./support').geo2loc

/**
 * 初始化路由规则
 */
module.exports = exports = function(robot){
  //用文本匹配
  robot.set({
    name: 'help', 
    description: 'pattern可以用字符串匹配,试着发送「help」',
    pattern: 'help',
    //指定如何回复
    handler: function(info, action, next) {
      var i = 1;
      var reply = _.chain(robot.get()).map(function(action){
        return (i++) + ') ' + (action.description||action.name)
      }).join('\n').value()
      next(null, '可用的指令:\n'+ reply);
    }
  });

  //用正则式匹配
  robot.set({
    name: 'say_hi', 
    description: 'pattern可以用正则表达式匹配,试着发送「hi」',
    pattern: /^Hi/i,
    handler: function(info) {
      //回复的另一种方式
      return '你也好哈';
    }
  });

  //可以用函数匹配
  robot.set({
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
  var replies={
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
        robot.rewait(info.from);
        return '还有' + action.retryCount + '次机会,再猜.'
      }
      return "有够笨的";
    }
  }
  robot.set({
    name: 'ask_sex',
    description: '与waiter联动,等待下一次回复,试着发送 「 sex? 」 然后再回复girl或boy或both或其他',
    pattern: 'sex?',
    handler: 'you guess',
    //下次回复动作,object格式,key为pattern,value为handler
    replies: replies
    
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
  robot.set({
    name: 'suggest_keyword',
    description: '与已有action联动,试着发送「key nde」  然后再回复Y或其他',
    pattern: /^(key)\s*(.+)/i,
    handler: function(info, action, next){
      //pattern的解析结果将放在query里
      var q = info.query[2];
      if(q == 'nde'){
        //另一种replies的方式
        robot.wait(info.from,{
          name: 'try_waiter_suggest',
          handler: function(next_info, next_action, next_handler){
            if(next_info.text.match(/y/i)){
              //next_handler(null, '输入变更为: node');
              info.text = 'nodejs'
              //调用已有的handler
              robot.exec(info, robot.get('search'), next_handler);
            }else{
              //next_handler(null, '仍然输入:'+ next_action.data);
              robot.exec(info, robot.get('search'), next_handler);
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
  robot.set({
    name: 'search', 
    description: '试着发送「s 500」然后Y或N, 或者发送「s 任何关键词」',
    pattern: /^(搜索?|search|s\b)\s*(.+)/i,
    handler: function(info, action, next){
      //pattern的解析结果将放在query里
      var q = info.query[2];

      //与waiter联动,等待下一次回复,试着发送 s 500 然后再回复Y
      var thesaurus = {
         '500': '伍佰'
      };
      if (q in thesaurus) {
        robot.wait(info.from,{
          //key支持正则式
          '/^y$/i': function(next_info, next_action, next_handler){
            log('search: %s', thesaurus[q])
            search(thesaurus[q], function(err, reply){
              return next_handler(null, reply);
            });
          },
          '/^n$/i': function(next_info, next_action, next_handler){
            log('search: %s', q)
            search(q, function(err, reply){
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
        return search(q , next);
      }
    }
  });

  //支持location消息,已经提供了geo转地址的工具，使用的是高德地图的API
  //http://restapi.amap.com/rgeocode/simple?resType=json&encode=utf-8&range=3000&roadnum=0&crossnum=0&poinum=0&retvalue=1&sid=7001&region=113.24%2C23.08
  robot.set({
    name: 'check_location', 
    description: '根据经纬度查询你的位置',
    pattern: function(info){
      return info.isLocation();
    },
    handler: function(info, action, next){
      geo2loc(info, function(err, location, data){
        next(null, location ? '你正在' + location : '我不知道你在什么地方。');
      });
    }
  });

  //图片
  robot.set({
    name: 'check_image', 
    description: '获取用户发送的图片',
    pattern: function(info){
      return info.isImage()
    },
    handler: function(info, action, next){
      log('image url: %s', info.picUrl)
    }
  });
}