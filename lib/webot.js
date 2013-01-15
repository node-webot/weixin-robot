"use strict";

var debug = require('debug');
var log = debug('webot:robot:log');
var warn = debug('webot:robot:warn');
var error = debug('webot:robot:error');

var Wind = require("wind");
var Binding = Wind.Async.Binding;
var Task = Wind.Async.Task;
Wind.logger.level = Wind.Logging.Level.INFO;

var _ = require('underscore')._

var Info = require('./info')
var Action = require('./action')

var middlewares = require('./middlewares');
//把middlewares托管给WeBot
_.extend(WeBot.prototype, middlewares);

/**
 * @class WeBot
 * 
 * 微信公众平台 - 开放消息接口机器人
 *
 * 官方文档: [http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN](http://mp.weixin.qq.com/cgi-bin/readtemplate?t=wxm-callbackapi-doc&lang=zh_CN)
 * 
 * - 公众平台用户提交信息后，我们将以GET请求方式请求到填写的Url上,若此次GET请求原样返回echostr参数内容，则接入生效，否则接入失败。
 * - 当普通微信用户向公众账号发消息时，公众平台将POST该消息到填写的Url上（现支持文本消息以及地理位置消息）。
 */
function WeBot(){
  //路由表
  this.routes = [];
  this.wait_rules = {};
  this.last_wait_rules = {};
  return this;
}

/**
 * @property {WeBot} WeBot 机器人
 * @static
 */
WeBot.prototype.WeBot = WeBot;

/**
 * @method set 路由, 设定动作规则
 * 
 * @param {Mixed} pattern 匹配规则
 * 
 *  - 当入参个数只有一个时,该参数作为{@link Action}或Action的配置
 *  - 否者作为匹配规则,参见{@link Action#pattern}
 * 
 * @param {Mixed} handler   处理逻辑,参见{@link Action#handler}
 * @param {Mixed} [replies] 下次回复动作,参见{@link Action#replies}
 */
WeBot.prototype.set = function(pattern, handler, replies){
  //函数重载
  var action = (arguments.length==1) ? pattern : {
    name: arguments[0],
    pattern: arguments[0],
    handler: arguments[1],
    replies: arguments[2]
  }

  if(action){
    //添加路由
    action = Action.convert(action)
    log('define route: [%s]', getActionName(action));
    this.routes = this.routes.concat(action);
  }
  return this;
};

/**
 * 获取已注册的动作
 * @param  {String} name  动作名
 * @return {Object/Array} 返回动作,如果入参为空,则返回全部动作.
 */
WeBot.prototype.get = function(name){
  return !name ? this.routes : _.find(this.routes, function(action){
    return action.name == name;
  }) 
};

/**
 * 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Action} action 动作或动作配置
 */
WeBot.prototype.wait = function(uid, action){
  var self = this;
  if(action){
    action = Action.convert(action)
    log('add wait route: [%s] for user: %s', getActionName(action), uid);
    self.wait_rules[uid] = action;
  }
  return this;
};

/**
 * 重试上一次等待
 * @param  {String} uid    用户ID
 */
WeBot.prototype.rewait = function(uid){
  var self = this;
  self.wait(uid, self.last_wait_rules[uid])
  return this
};

/**
 * @method exec
 * @protected
 * @inheritdoc Action#exec
 */
WeBot.prototype.exec = Action.exec;

//把执行函数转换为wind的异步任务并执行
WeBot.execSync = Binding.fromStandard(Action.exec, 'reply');

/**
 * @method reply 消息处理,遍历已注册的规则,获取回复消息.
 * 参见{@link Action#exec}
 * 
 * @param {Object}   data    微信发来的消息,JSON格式
 * @param {Function} cb      回调函数, function(err,reply)
 * @param {Error}    cb.err  错误消息
 * @param {Info}     cb.info 回复消息,调用info.toXML()即可得到回复的格式
 * @protected
 */
WeBot.prototype.reply = function(data, cb){
  var self = this;

  //转换Info
  log('got req msg: %j', data);
  var info = new Info(data, self.config);
  if(!self.config.keepBlank && info.text){
    info.text = info.text.trim();
  }

  log('start checking each action');

  //要执行的action列表
  var actionList = self.routes;

  //存在waiter则执行
  var waiter = self.wait_rules[info.user]
  if(waiter){
    log('find waiter: %s', getActionName(waiter));
    actionList = [].concat(waiter).concat(self.routes);
    self.last_wait_rules[info.user] = waiter;
    self.wait_rules[info.user] = null;
  }

  //遍历action
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < actionList.length; i++){
        var action = actionList[i];
        if(Action.isMatch(info, action)){
          action.count = i;
          log('action [%s] match.', action.name,action.count,info.text);
          var result =$await(WeBot.execSync(info, action));
          if(result.reply){
            //存在要求回复的动作
            if(action.replies){
              //把replies转为action格式,并提交wait
              self.wait(info.user, Action.convert(action.replies, action.name));
            }
            info.reply = result.reply
            return cb(null, info);
          }
        }
      };
      //未找到匹配的规则
      info.reply = self.getStatus('404') 
      return cb('404', info);
    }catch(err){
      error('WeBot.reply exec error: %s', err);
      info.reply = self.getStatus(String(err)) || self.getStatus('500')
      return cb(err);
    }
  }));
  task().start();
  return this;
}

/**
 * @method monitor  简单的使用webot
 * @param  {String} token 在微信公众平台填入的token
 * @param  {String} path  映射的路径
 * @param  {Object} app   express的实例
 */
WeBot.prototype.monitor = function(token, path, app){
  var self = this;
  var checkSig = self.checkSig(token);
  //鉴权
  app.get(path, checkSig);

  //消息处理
  app.post('/', checkSig, self.bodyParser(), function(req, res, next) {
    //机器人根据请求提供回复,具体回复规则由 webot.set() 和 webot.wait() 定义
    self.reply(req.wx_data, function(err, info) {
      log('got reply msg: %s, %s', err, info.reply);
      //返回消息,必须是XML
      res.type('xml');
      res.send(info.toXML());
    });
  });
  return this;
}

/**
 * @property {Object} config 配置选项
 *
 * - keepBlank {String} 是否保留文本消息的前后空格
 * - statusMsg {Object} 异常消息的友好回复,参考HTTP CODE
 * 
 *   - 204 : 人工延迟回复,将回复: 「你的消息已经收到，若未即时回复，还望海涵」
 *   - 403 : 鉴权失败,将回复: 「鉴权失败,你的Token不正确」
 *   - 404 : 没有找到匹配规则, 将回复: 「听不懂你在说什么哦」
 *   - 500 : 服务器抛异常,将回复: 「服务器临时出了一点问题，您稍后再来好吗」
 */
WeBot.prototype.config = {
  keepBlank: true,
  statusMsg: {
    '204': '你的消息已经收到，若未即时回复，还望海涵',
    '403': '鉴权失败,你的Token不正确',
    '404': '听不懂你在说什么哦', 
    '500': '服务器临时出了一点问题，您稍后再来好吗'
  },
  mapping:{
    'title': 'title',
    'description': 'description',
    'pic': 'pic',
    'url': 'url'
  }
};

/**
 * 根据status code 获取友好提示消息
 * @param  {Error} code  错误码,
 * @return {String}      提示消息
 * @protected
 */
WeBot.prototype.getStatus = function(code){
  return this.config.statusMsg[String(code)] || code
}

/**
 * @method getActionName
 * 获取action名
 * @param  {Action/Array} action 
 * @return {String}        返回动作名,若入参为数组则返回逗号分隔的动作名
 * @private
 */
function getActionName(action){
  if(!action) return ''
  return _.isArray(action) ? _.pluck(action,'name').join(',') : action.name
}


module.exports = exports = new WeBot();


