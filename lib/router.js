var debug = require('debug');
var error = debug('weixin:router:error');
var log = debug('weixin:router:log');

// A Simple Router
function Router(){
  this.routes = [];
  this.route_index = {};
  // handlebars for special kind of request
  this.specials = {};
  this.current = 0;
  this.waiter = null;
  return this;
}

Router.prototype.set = function(n, info){
  if (typeof info === 'function') {
    log(n, 'add special route for type')
    // special type only have one handler
    this.specials[n] = info;
    return;
  }
  log(n, 'add route:')
  this.route_index[n] = this.routes.length;
  info['name'] = n;
  this.routes.push(info);
};
Router.prototype.get = function(n){
  var i = this.route_index[n];
  // You must known for sure what will return by yourself.
  return this.routes[i] || this.specials[n];
};
// Proceed routes one by one,
// if handler or it's callback return truely, 
// then call 'cb' successfully. Otherwise,
// continue to next route and pass on the error.
Router.prototype.proceed = function(info, cb){
  var self = this;
  var type = info['type'];
  if (type !== 'text') {
    log(type, 'special route');
    if (!(type in self.specials)) return cb(400);
    return self.specials[type](info, cb);
  }

  var text = info['text'];

  var i = 0;
  function tick(i, err, next){
    var item = self.routes[i];
    if (!item) {
      log('router reached end, still no good return');
      if (self.waiter) {
        log('Try waiter...');
        var rules = self.waiter.rules;
        var rules_list = self.waiter.rules_list;
        for (var i = 0, l = rules_list.length; i < l; i++) {
          var act = rules_list[i];
          var p = rules[act];
          p = p && p['pattern'];
          if (!p) continue;
          if (typeof p === 'function' && p.call(self.waiter, info) || info.text.search(p) !== -1) {
            var tip = self.waiter.reserve(info.from, act, info);
            return cb(null, tip);
          }
        }
      }
      return cb(err || 400);
    }
    var _name = item['name'];
    log(_name, 'dispatch');

    var matched = true;
    if (typeof item.pattern == 'function') {
      log(_name, 'pattern is a function');
      matched = item.pattern.call(self, info);
    } else if (item.pattern) {
      log(_name, 'pattern is string/regexp');
      matched = text.search(item.pattern) !== -1;
    }
    if (!matched) {
      log(_name, 'not match');
      return next(i+1, err, tick);
    }

    function handle(){
      if (item.handler.length == 1) {
        var ret = item.handler.call(self, info);
        // direct return
        if (ret)  return cb(err, ret);
      } else if (item.handler.length == 2) {
        // async call
        return item.handler.call(self, info, function(e, ret){
          if (e) {
            log(_name, 'handler failed at', e);
            if (info.ended) return cb(e, ret);
          }
          if (e || !ret) return next(i+1, e || err, tick);
          cb(err, ret);
        });
      } else {
        error('unsupported handler define', _name);
      }
      next(i+1, err, tick);
    }

    if ('parser' in item) {
      if (item.parser.length == 1) {
        info = item.parser.call(self, info);
      } else if (item.parser.length == 2) {
        item.parser.call(self, info, function(e, new_info) {
          if (e || !new_info) {
            log(_name, 'parse failed at', e, new_info);
            return next(i+1, e || err, tick);
          }
          info = new_info;
          handle();
        });
        return;
      } else {
        error('unsupported parser define', _name);
        return next(i+1, err, tick);
      }
    }

    handle();
  }
  tick(i, null, tick);
};
module.exports = function() {
  return new Router();
};
module.exports.Router = Router;
