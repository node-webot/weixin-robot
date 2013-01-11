"use strict";

var debug = require('debug');
var log = debug('weixin:robot:log');
var warn = debug('weixin:robot:warn');
var error = debug('weixin:robot:error');

var Wind = require("wind");
var Binding = Wind.Async.Binding;
var Task = Wind.Async.Task;
Wind.logger.level = Wind.Logging.Level.INFO;

var Action = require('./action')
var _ = require('underscore')._

/**
 * @class Robot
 * 微信机器人
 * @author TZ <atian25@qq.com>
 */
function Robot(){
  //路由表
  this.routes = [];
  this.wait_rules = {};
  this.last_wait_rules = {};
  return this;
}

/**
 * 路由, 设定动作规则
 * @param  {Action} action 动作或动作配置
 */
Robot.prototype.route = function(action){
  if(action){
    //添加路由
    action = new Action(action)
    log('define route: [%s]', getActionName(action), action);
    this.routes = this.routes.concat(action);
  }
  return this;
};

/**
 * 路由, 设定动作规则
 * @param {Mixed} pattern   匹配规则,参见{@link Action#pattern}
 * @param {Mixed} handler   处理逻辑,参见{@link Action#handler}
 * @param {Mixed} [replies] 下次回复动作,参见{@link Action#replies}
 */
Robot.prototype.set = function(pattern, handler, replies){
  this.route({
    pattern: pattern,
    handler: handler,
    replies: replies
  })
  return this
};

/**
 * 获取已注册的动作
 * @param  {String} name  动作名
 * @return {Object/Array} 返回动作,如果入参为空,则返回全部动作.
 */
Robot.prototype.get = function(name){
  return !name ? this.routes : _.find(this.routes, function(action){
    return action.name == name;
  }) 
};

/**
 * 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Action} action 动作或动作配置
 */
Robot.prototype.wait = function(uid, action){
  var self = this;
  if(action){
    action = Action.convert(action)
    log('add wait route: [%s] for user: %s', getActionName(action), uid);
    self.last_wait_rules[uid] = action;
    self.wait_rules[uid] = action;
  }
  return this;
};

/**
 * 消息处理
 * @param {Object}   info   微信发来的消息
 * @param {Function} cb     回调函数, function(err,reply)
 * @param {Error}    cb.err 错误消息
 * @param {String/Array} cb.reply 回复消息
 * 
 * - String: 文本消息
 * - Array:  图文消息
 * - Null:   执行下一个动作
 */
Robot.prototype.reply = function(info, cb) {
  log('check each action');
  var self = this;

  //要执行的action列表
  var actionList = self.routes;

  //存在waiter则执行
  var waiter = self.wait_rules[info.from]
  if(waiter){
    log('find waiter: %s', getActionName(waiter));
    actionList = [].concat(waiter).concat(self.routes);
    self.wait_rules[info.from] = null;
  }

  //遍历action
  var task = eval(Wind.compile("async", function(){
    try{
      //遍历route
      for (var i = 0; i < actionList.length; i++) {
        var action = actionList[i];
        if(Action.isMatch(info, action)){
          log('match action: [%s]', action.name);
          var result =$await(Robot.execSync(info, action));
          if(result.reply){
            //存在要求回复的动作
            if(action.replies){
              //把replies转为action格式,并提交wait
              self.wait(info.from, Action.convert(action.replies, action.name));
            }
            return cb(null, result.reply);
          }
        }
      };
      return cb('404', Robot.MSG_ERROR['404']);
    }catch(err){
      error('Robot.reply exec error: %s', err);
      return cb(err, Robot.MSG_ERROR[String(err)] || Robot.MSG_ERROR['500']);
    }
  }));
  task().start();
  return this;
}

/**
 * @property {Action} Action Action类
 * @static
 */
Robot.Action = Action;

/**
 * @method exec
 * @inheritdoc Action#exec
 * @static
 */
Robot.exec = Action.exec;

//把执行函数转换为wind的异步任务并执行
Robot.execSync = Binding.fromStandard(Action.exec, 'reply');

/**
 * @method convert
 * @inheritdoc Action#convert
 * @static
 */
Robot.convert = Action.convert;

/**
 * @method isMatch
 * @inheritdoc Action#isMatch
 * @static
 */
Robot.isMatch = Action.isMatch;

/**
 * 获取action名
 * @param  {Action/Array} action 
 * @return {String}        返回动作名,若入参为数组则返回逗号分隔的动作名
 * @private
 */
function getActionName(action){
  if(!action) return ''
  return _.isArray(action) ? _.pluck(action,'name').join(',') : action.name
}

/**
 * @property {Object} 
 * 
 * 错误码的描述,参考HTTP CODE
 * 
 * - 404 : 没有找到匹配规则, 将回复: 「听不懂你在说什么哦」
 * - 204 : 人工延迟回复,将回复: 「你的消息已经收到，若未即时回复，还望海涵」
 * - 500 : 服务器抛异常,将回复: 「服务器临时出了一点问题，您稍后再来好吗」
 * 
 * @static
 */
Robot.MSG_ERROR = {
  '404': '听不懂你在说什么哦', 
  '204': '你的消息已经收到，若未即时回复，还望海涵',
  '500': '服务器临时出了一点问题，您稍后再来好吗'
};

module.exports = exports = Robot;

