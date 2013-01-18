var debug = require('debug');
var log = debug('webot:example');

var _ = require('underscore')._;
var search = require('./support').search;
var geo2loc = require('./support').geo2loc;
var download = require('./support').download;

/**
 * 初始化路由规则
 */
module.exports = exports = function(webot){
  //设置一条规则
  webot.set(/^(help|帮助|\?)$/i, function(info, action){
    action.description = 'help';

    var reply = _.chain(webot.get()).filter(function(action){
      return action.description;
    }).map(function(action){
      return '> ' + action.description;
    }).join('\n').value();
    
    return '可用的指令:\n'+ reply;
  });

  //首次关注时,会收到Hello2BizUser
  webot.set('Hello2BizUser', function(info, action){
    return '感谢你收听webot机器人,\n回复help可以查看支持的指令.\n我们的github地址是: <a href="https://github.com/ktmud/weixin-robot">https://github.com/ktmud/weixin-robot</a>';
  });

  //可以通过回调处理,如果返回null则执行下一个action
  webot.set(/.*/i, function(info, action, next){
    log('can load sth from db, then go next action');
    //info.text = 'who'
    return next(null);
    //或 return null;
  });

  //也接受object参数
  webot.set({
    name: 'who_are_you',
    description: '想知道我是谁吗? 发送: who?',
    //pattern可以是regexp或字符串(模糊匹配)
    pattern: /who|你是谁?\??/i,
    //回复handler也可以直接是字符串或数组,如果是数组则随机返回一个子元素
    handler: ['我是神马机器人','微信机器人']
  });

  //正则匹配后的匹配组存在info.query中
  webot.set({
    name: 'your_name',
    description: '自我介绍下吧, 发送: I am [enter_your_name]',
    pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
    // handler: function(info, action){
    //   return '你好,' + info.query[1]
    // }
    
    //或者更简单一点
    handler: '你好,{1}'
  });

  //pattern支持函数
  webot.set({
    name: 'pattern_fn',
    description: 'pattern支持函数,发送: fn',
    pattern: function(info){
      return info.isText() && info.text=='fn';
    },
    handler: 'pattern支持函数'
  });

  //读取dialog文件
  webot.dialog(__dirname + '/dialog.yaml');

  //一次性加多个吧
  webot.set([{
    name: 'morning',
    description: '打个招呼吧, 发送: good morning',
    pattern: /^(早上?好?|(good )?moring)[啊\!！\.。]*$/i,
    //handler也可以是异步的
    handler: function(info, action){
      var d = new Date();
      var h = d.getHours();
      if (h < 3) return '[嘘] 我这边还是深夜呢，别吵着大家了';
      if (h < 5) return '这才几点钟啊，您就醒了？';
      if (h < 7) return '早啊官人！您可起得真早呐~ 给你请安了！\n 今天想参加点什么活动呢？';
      if (h < 9) return 'Morning, sir! 新的一天又开始了！您今天心情怎么样？';
      if (h < 12) return '这都几点了，还早啊...';
      if (h < 14) return '人家中午饭都吃过了，还早呐？';
      if (h < 17) return '如此美好的下午，是很适合出门逛逛的';
      if (h < 21) return '早，什么早？找碴的找？';
      if (h >= 21) return '您还是早点睡吧...';
    }
  },{
    name: 'time',
    description: '想知道几点吗? 发送: time',
    pattern: /^(几点了|time)\??$/i,
    handler: function(info) {
      var d = new Date();
      var h = d.getHours();
      var t = '现在是北京时间' + h + '点' + d.getMinutes() + '分';
      if (h < 4 || h > 22) return t + '，夜深了，早点睡吧 [月亮]';
      if (h < 6) return t + '，您还是再多睡会儿吧';
      if (h < 9) return t + '，又是一个美好的清晨呢，今天准备去哪里玩呢？';
      if (h < 12) return t + '，一日之计在于晨，今天要做的事情安排好了吗？';
      if (h < 15) return t + '，午后的冬日是否特别动人？';
      if (h < 19) return t + '，又是一个充满活力的下午！今天你的任务完成了吗？';
      if (h <= 22) return t + '，这样一个美好的夜晚，有没有去看什么演出？';
      return t;
    }
  }]);

  //等待下一次回复
  webot.set({
    name: 'ask_sex',
    description: '发送: sex? ,然后再回复girl或boy或both或其他',
    pattern: /^sex\??$/i,
    handler: '你猜猜看',
    //下次回复动作,replies,可以是任何能转换为action数组的对象,如Object,Array,String,Function等
    //object格式,key为pattern,value为handler, 注意object是没有顺序的
    replies: {
      //正则作为key的时候,注意要转义
      '/^g(irl)?\\??$/i': '猜错',
      'boy': function(info, action, next){
        return next(null, '猜对了');
      },
      'both': '对你无语...'
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
  
  //也可以这样wait,并且rewait
  webot.set({
    name: 'guest_game',
    description: '发送: game , 玩玩猜数字的游戏吧',
    pattern: /game (\d*)/,
    handler: function(info, action){
      //等待下一次回复
      var retryCount = 3;
      var num = Number(info.query[1]) || _.random(1,9);
      log('answer is: ' + num);
      webot.wait(info.user, function(next_info, next_action){
        var text = Number(next_info.text);
        if(text){
          if(text == num){
            return '你真聪明!';
          }else if(retryCount > 1){
            retryCount--;
            //重试
            webot.rewait(info.user);
            return (text > num ? '大了': '小了') +',还有' + retryCount + '次机会,再猜.';
          }else{
            return '好吧,你的IQ有点抓急,谜底是: ' + num;
          }
        }else{
          //不是文本消息,跳过,交给下一个action
          return null;
        }
      });
      return '玩玩猜数字的游戏吧, 1~9,选一个';
    }
  });

  //调用已有的action
  webot.set({
    name: 'suggest_keyword',
    description: '发送: s nde ,然后再回复Y或其他',
    pattern: /^(搜索?|search|s\b)\s*(.+)/i,
    handler: function(info, action){
      var q = info.query[2];
      if(q == 'nde'){
        webot.wait(info.user,{
          name: 'try_waiter_suggest',
          handler: function(next_info, next_action, next_handler){
            if(next_info.text.match(/y/i)){
              //next_handler(null, '输入变更为: node');
              //注意,这里用的是上一次的info,而不是next_info
              next_info.text = 'nodejs';
              next_info.query = ['' ,'' ,'nodejs'];
              //调用已有的handler
              webot.exec(next_info, webot.get('search'), next_handler);
            }else{
              next_info.text = 'nde';
              next_info.query = ['' ,'' ,'nde'];
              //next_handler(null, '仍然输入:'+ next_action.data);
              webot.exec(next_info, webot.get('search'), next_handler);
            }
          }
        });
        return '你输入了:' + q + '，似乎拼写错误。要我帮你更改为「nodejs」并搜索吗?';
      }
    }
  });

  //可以通过回调返回结果
  webot.set({
    name: 'search',
    description: '发送: s 关键词 ',
    pattern: /^(搜索?|search|s\b)\s*(.+)/i,
    handler: function(info, action, next){
      //pattern的解析结果将放在query里
      var q = info.query[2];
      log('searching: ', q);
      //从某个地方搜索到数据...
      return search(q , next);
    }
  });


  //超时处理
  webot.set({
    name: 'timeout',
    description: '输入timeout,等待5秒后回复,会提示超时',
    pattern: 'timeout',
    handler: function(info, action){
      var now = new Date().getTime();
      webot.wait(info.user, function(next_info, next_action){
        if(new Date().getTime() - now > 5000){
          return '你的操作超时了,请重新输入';
        }else{
          return '你在规定时限里面输入了: ' + next_info.text;
        }
      });
      return '请等待5秒后回复';
    }
  });

  //支持location消息,已经提供了geo转地址的工具，使用的是高德地图的API
  //http://restapi.amap.com/rgeocode/simple?resType=json&encode=utf-8&range=3000&roadnum=0&crossnum=0&poinum=0&retvalue=1&sid=7001&region=113.24%2C23.08
  webot.set({
    name: 'check_location',
    description: '发送你的经纬度,我会查询你的位置',
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
  webot.set({
    name: 'check_image',
    description: '发送图片,我将下载它',
    pattern: function(info){
      return info.isImage();
    },
    handler: function(info, action){
      log('image url: %s', info.pic);
      try{
        var path = __dirname + '\\image' 
          //+ new Date().getTime() 
          + '.png';
        download(info.pic, path);
        return '你的图片已经保存到:' + path;
      }catch(e){
        return '图片下载失败: ' + e;
      }
    }
  });

  //图文的映射关系, 可以是object或function
  webot.config.mapping = function(item, index, info){
    item.title = (index+1) + '> ' + item.title;
    return item;
  };

  //回复图文消息
  webot.set({
    name: 'reply_news',
    description: '发送news,我将回复图文消息你',
    pattern: /^news\s*(\d*)$/,
    handler: function(info, action){
      var reply = [
        {title: '微信机器人', description: '微信机器人测试帐号：webot', pic: 'https://raw.github.com/ktmud/weixin-robot/master/examples/qrcode.jpg', url: 'https://github.com/atian25'},
        {title: '豆瓣同城微信帐号', description: '豆瓣同城微信帐号二维码：douban-event', pic: 'http://i.imgur.com/ijE19.jpg', url: 'https://github.com/ktmud/weixin-robot'},
        {title: '图文消息3', description: '图文消息描述3', pic: 'https://raw.github.com/ktmud/weixin-robot/master/examples/qrcode.jpg', url: 'http://www.baidu.com'}
      ];
      return Number(info.query[1])== 1 ? [reply[0]] : reply;
    }
  });

  //容错
  webot.set(/.*/i, function(info, action){
    return '你发送了「' + info.text + '」,可惜我太笨了,听不懂. 发送: help 查看可用的指令';
  });
};