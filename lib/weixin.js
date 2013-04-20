var webot = require('webot');
var Webot = webot.Webot;
var Info = webot.Info;
var wechat = require('wechat');

var watch = Webot.prototype.watch;

// convert weixin props to
// standard more human readable names
var pmap = {
    FromUserName: 'uid'
  , ToUserName: 'sp'
  , CreateTime: 'createTime'
  , MsgId: 'id'
  , MsgType: 'type'
  , Content: 'text'
};
var mmap = {
    Location_X: 'lat'
  , Location_Y: 'lng'
  , Scale: 'scale'
  , Label: 'label'
  , PicUrl: 'picUrl'
  , Event: 'event'
  , EventKey: 'eventKey'
  , Url: 'url'
  , Title: 'title'
  , Description: 'description'
};

function normInfo(original) {
  var param = {};
  var data = {
    original: original,
    param: param
  };

  var key, val;
  for (key in original) {
    val = original[key];
    // normalize for xml2js
    if (val.length === 1) {
      val = original[key] = val[0]
    }
    if (key in pmap) {
      data[pmap[key]] = val;
    } else if (key in mmap) {
      param[mmap[key]] = val;
    } else {
      data[key] = val;
    }
  }
  data.created = new Date(parseInt(original.CreateTime, 10) * 1000);
  return Info(data);
}

Webot.prototype.watch = function(app, options) {
  options = options || {}

  if (typeof options === 'string') {
    options = {
      token: options
    };
  }

  var self = this;
  app.use(options.path || '/', wechat(options.token, function(req, res, next) {
    var info = normInfo(req.weixin);
    info.session = req.wxsession;
    self.reply(info, function(err, info) {
      var reply = info.reply;
      if (typeof reply === 'object' && !reply.type && !Array.isArray(reply)) {
        reply = [reply];
      }
      res.reply(reply, info.flag);
    });
  }));
};

/**
 * Legacy API support.
 */
//webot.Info.prototype.toXML = function() {
  //this.flag = this.flag || 0;
  //return wechat.info2xml(this);
//};

module.exports = webot;
module.exports.wechat = wechat;
