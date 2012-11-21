var error = require('debug')('weixin:robot:error');
var log = require('debug')('weixin:robot');

var Router = require('./router').Router;
var Waiter = require('./waiter').Waiter;

var Robot = function(router, waiter) {
  if (!router) router = new Router();
  if (!waiter) waiter = new Waiter();
  router.waiter = this.waiter = waiter;
  waiter.router = this.router = router;
};

Robot.prototype.reply = function(info, cb) {
  var self = this;
  var uid = info.from;
  var act = self.waiter.reserve(uid);
  if (act) {
    var r = self.waiter.respond(uid, act, info, cb);
    if (!r) return;
    log('user not respond to waiting', act, ', continue routing..');
  }
  log('got into router', info);
  return self.router.proceed(info, cb);
};

module.exports = function(router, waiter) {
  return new Robot(router, waiter);
};
module.exports.Robot = Robot;
