var debug = require('debug');
var error = debug('weixin:router:error');
var log = debug('weixin:router:log');

var utils = require('./utils');

// A Simple Router
function Router(){
  this.routes = [];
  this.dialogs = [];
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
  log('add route: %s', n)
  this.route_index[n] = this.routes.length;
  info['name'] = n;
  this.routes.push(info);
};
Router.prototype.get = function(n){
  var i = this.route_index[n];
  // You must known for sure what will return by yourself.
  return this.routes[i] || this.specials[n];
};
Router.prototype.dialog = function(dialogs) {
  this.dialogs = this.dialogs.concat(dialogs);
  this.set('dialog' + this.routes.length, {
    'handler': function(info) {
      var text = info['text'];
      if (!text) return;
      var r, ret;
      for (var i = 0, l = dialogs.length; i < l; i++) {
        r = dialogs[i];
        if (contains(text, r[0])) {
          ret = r[1];
          if (ret instanceof Array) ret = utils.sample(ret, 1)[0];
          if (typeof ret === 'function') ret = ret(info);
          ret = String(ret);
          // let the reply can use pattern matched groups
          var m = ret.match(/(?![^\\])\\[0-9]+/g);
          if (m) {
            var p_m = text.match(r[0]);
            for (var j = 0, k = m.length; j < k; j++) {
              var n = parseInt(m[j].replace('\\', ''));
              ret = ret.replace(m[j], p_m[n]); 
            }
          }
          return ret;
        }
      }
    }
  });
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
      if (info.ended) return cb(e, ret);
      if (self.waiter) {
        log('Try waiter...');
        var rules = self.waiter.rules;
        for (var i = 0, l = rules.length; i < l; i++) {
          var p = rules[i];
          var act = p['name'];
          p = p && p['pattern'];
          if (!p) {
            log(act, 'waiter has no match pattern');
            continue;
          }
          var wait_matched = typeof p === 'function' ? p.call(self.waiter, info) : info.text.search(p) !== -1;
          if (wait_matched) {
            log(act, 'waiter matched');
            var tip = self.waiter.reserve(info.from, act, info);
            return cb(null, tip);
          }
        }
      }
      return cb(err || 400);
    }

    // 当前route
    self.current = item;

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
            if (info.ended) {
              log(_name, 'specifically ended anyway');
              return cb(e, ret);
            }
          }
          if (!ret) {
            log(_name, 'not return, continue to next route');
            return next(i+1, e || err, tick);
          }
          cb(err, ret);
        });
      } else {
        error('unsupported handler define', _name);
      }
      next(i+1, err, tick);
    }

    if ('parser' in item) {
      if (item.parser.length == 1) {
        var r = item.parser.call(self, info);
        if (r) info = r;
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

function contains(str, p) {
  if (typeof p == 'string') {
    // completely match
    if (p[0] == '#') return '#' + str === p;
    return str.indexOf(p) !== -1;
  } else {
    return str.search(p) !== -1;
  }
}


module.exports = function() {
  return new Router();
};
module.exports.Router = Router;
