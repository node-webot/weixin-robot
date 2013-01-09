var debug = require('debug');
var log = debug('weixin:robot:log');
var warn = debug('weixin:robot:warn');
var error = debug('weixin:robot:error');

var async = require('async');

function Robot(){
  //当前正在执行的action
  this.current = null;
  //路由表
  this.routes = [];
  this.route_index = {};
  //等待动作
  this.wait_rules = {};
  return this;
}

/**
 * 静态变量
 */
//执行完毕,则不会进去下一个route(如果有的话)
Robot.PROCESS_DONE = '200';
//未找到匹配的路由
Robot.NOT_MATCH_ROUTE = '400';

/**
 * 设置路由
 * @param {String} name 动作名,可以省略
 * @param {Object} action 动作
    {
      name: {String}
      type: {String}  text/location/image
      pattern: {Mix} RegExp|String|Function(info) 判断内容是否匹配,支持字符串,正则式,函数.没有pattern则视为匹配成功
      handler: handleFunc(info, [next]) 处理函数  function(info, next)
    }
 */
Robot.prototype.route = function(name, action){
  if(arguments.length==1){
    action = name;
  }else{
    action.name = name;
  }

  //添加路由
  log('define route: [%s]', action.name);
  //已经注册过这个名称的action
  if(action.name in this.route_index){
    warn('route [%s] is already exist.', action.name);
    this.routes[this.route_index[action.name]] = action;
  }else{
    this.route_index[action.name] = this.routes.length;
    this.routes.push(action);    
  }
};

/**
 * 获取通过route设置的action
 */
Robot.prototype.get = function(name){
  var i = this.route_index[name];
  return this.routes[i];
};

/**
 * 等待下一次回复
 * @param  {String} uid    用户ID
 * @param  {Object} action 动作
 * 支持2种格式, 具体看示例
 * TODO: 直接调用route的ation
 * TODO: 支持retry
 */
Robot.prototype.wait = function(uid, action){
  var self = this;
  log('add wait route: [%s] for user: %s', action.name, uid);
  //转换replies为handler,仅支持消息类型为text
  if(action.replies){
    action.pattern = function(info){
      if(info.type === 'text' && info.text){
        //遍历key,作为正则匹配
        for(var key in action.replies){
          if(info.text.match(str2Regex(key))){
            action.handler = action.replies[key];
            return true;
          }
        }
      }
      return false;
    }

  }
  self.wait_rules[uid] = action;
}

//TODO: 判断action是否有replyaction,则wait
/**
 * 执行路由action
 * @param  {Object}   action 路由action或名称
 * 
 * @param  {Object}   info   微信发来的消息,也作为结果存储: 
 * - query 为正则式pattern匹配出的参数数组
 * - ended  为true则通知route结束遍历.
 * - reply  回复的结果
 * 
 * @param  {Function} next   下一个路由,next(err)
 */
Robot.prototype.exec = function(action, info, next){
  var self = this;

  if( (typeof action) === 'string' ){
    action = self.get(action);
  }

  self.current = action;
  log('checking action: [%s]', action.name);

  //当info不存在时
  if(!info){
    return next( self.ERROR_MSG[self.NOT_MATCH_ROUTE]);
  }

  //是否匹配
  var isMatch = false;
  if(action.pattern){
    if( (typeof action.pattern) !== 'function' ){
      //仅对文本消息支持正则式匹配
      var query = info.type=='text' && info.text && info.text.match(action.pattern);
      if(query){
        //把匹配组赋值给info.query
        info.query = query;
        isMatch = true;
      }
    }else{
      isMatch = action.pattern.call(self, info);
    }
  }else{
    //没有pattern则视为匹配成功
    isMatch = true;
  }

  //执行动作
  if(isMatch){
    log('match route: [%s]', action.name);
    //当handler不是函数时,直接作为字符串返回
    if(typeof action.handler !== 'function'){
      info.ended = true;
      info.reply = action.handler;
      next(Robot.PROCESS_DONE, info.reply);
    }else if(action.handler.length<=1){
      //handler只定义了一个参数时,直接返回
      info.ended = true;
      info.reply = action.handler.call(self, info);
      next(Robot.PROCESS_DONE, info.reply);
    }else{
      action.handler.call(self, info, function(err, reply){
        //兼容通过callback传值
        if(reply){
          info.ended = true;
          info.reply = reply;
        }
        //当action把ended设置为真时,结束遍历.
        if(info.ended){
          next(Robot.PROCESS_DONE, info.reply);
        }else{
          //继续下一个action
          next(err);
        }
      });
    }
  }else{
    next();
  }
}

/**
 * 消息处理
 * @param  {Object}   info 微信发来的消息
 * @param  {Function} cb   回调函数, function(err,reply)
 */
Robot.prototype.reply = function(info, cb) {
  log('check each action');
  var self = this;
  
  //当info不存在时,报错.
  if(!info){
    info = { err: '400' };
    return self.exec.call(self, self.errorHandler, info, cb);
  }

  //要执行的action列表
  var actionList = self.routes;

  //TODO: 执行类型为location/image
  
  //存在waiter则执行
  var waiter = self.wait_rules[info.from]
  if(waiter){
    log('find waiter: %s', waiter.name);
    actionList = [waiter].concat(self.routes);
    self.wait_rules[info.from] = null;
  }

  //遍历action
  async.forEachSeries(actionList, function(action, next){
    self.exec.call(self, action, info, next)
  }, function(err){
    //把处理结果回传给上层
    log('route done: %s , %s', err, info.reply);
    //错误处理
    if(!info.ended){
      info.err = err;
      return self.exec.call(self, self.errorHandler, info, cb);
    }else{
      cb(null, info.reply);
    }
    self.current = null;
  });
}

/**
 * 错误码
 */
Robot.prototype.ERROR_MSG = {
  '400': '听不懂你在说什么哦', //'你的消息已经收到，若未即时回复，还望海涵',
  '503': '服务器临时出了一点问题，您稍后再来好吗'
}

/**
 * 默认的错误处理
 * @type {Object} action 动作
 */
Robot.prototype.errorHandler = {
  name: 'error_handler',
  handler: function(info, next){
    var self = this;
    var messages = self.ERROR_MSG;
    //出错之后，提示一下
    var err = info.err;
    if(err){
      error('ERROR: %s', err);
      return next(err, messages[String(err)] || messages['503']);
    }else{
      log('NOT_MATCH_ROUTE')
      return next(null, messages['400']);
    }
  }
};

/**
 * 把字符串转为正则式,不是正则式则返回原字符串
 */
function str2Regex(str){
  //var rule = /\/(\\[^\x00-\x1f]|\[(\\[^\x00-\x1f]|[^\x00-\x1f\\\/])*\]|[^\x00-\x1f\\\/\[])+\/([gim]*)/;
  var rule = /\/(.*)\/(?=[igm]*)([igm]*)/
  var match = str.match(rule);
  return match ? new RegExp(match[1],match[2]) : str;
}

module.exports = exports = function() {
  return new Robot();
};
module.exports.Robot = Robot;
