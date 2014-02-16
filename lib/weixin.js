var webot = require('webot')
var Webot = webot.Webot
var Info = webot.Info
var wechat = require('wechat-mp')
var debug = require('debug')('webot:debug')

var mp = wechat()

// keep the original watch method private,
// but accessible.
Webot.prototype._watch = Webot.prototype.watch

Webot.prototype.watch = function(app, options) {
  options = options || {}
  if (typeof options === 'string') {
    options = {
      token: options
    }
  }

  var self = this
  var path = options.path || '/'

  // start must go before cookie middleware
  app.use(path, mp.start(options))

  // handlers can be set at last
  process.nextTick(function() {
    app.use(path, self.middleware())
    app.use(path, mp.end())
    debug('watching "%s" ~ %j', path, options)
  })
}

Webot.prototype.formatReply = function(info) {
  // the response body should be data we want to send to wechat
  // empty news will shut up wechat.
  var reply = info.reply || []
  var replyType = reply.type || 'text'

  if (typeof reply === 'object' && !reply.type && !Array.isArray(reply)) {
    reply = [reply]
  }
  if (Array.isArray(reply)) {
    replyType = 'news'
  }
  if (info.noReply) {
    reply = ''
  }
  return {
    sp: info.sp,
    uid: info.uid,
    msgType: replyType,
    content: reply,
    createTime: new Date(),
  }
}

Webot.prototype.middleware = function() {
  var self = this
  return function(req, res, next) {
    var info = Info(req.body)

    info.req = req
    info.res = res
    info.session = req.session

    self.reply(info, function(err, info) {
      res.body = self.formatReply(info)
      next()
    })
  }
}

// Export `wechat-mp` module.
webot.wechat = wechat

module.exports = webot
