var webot = require('webot');
var Webot = webot.Webot;
var wechat = require('wechat-mp');

var watch = Webot.prototype.watch;

Webot.prototype.watch = function(app, options) {
  options = options || {}

  if (typeof options === 'string') {
    options = {
      token: options
    };
  }

  var self = this;

  options.verify = wechat.checkSig(options.token);
  options.parser = wechat.bodyParser(options);
  options.send = wechat.resBuilder(options.mapping);
  options.prop = 'wx_data';

  watch.call(this, app, options);
};

module.exports = webot;
module.exports.wechat = wechat;
