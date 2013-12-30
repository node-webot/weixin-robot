var webot = require('webot');
var Webot = webot.Webot;
var Info = webot.Info;
var wechat = require('wechat');

// convert weixin props to
// more human readable names
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
  // 上报地理位置事件 Event == LOCATION
  , Latitude: 'lat'
  , Longitude: 'lng'
};

function normInfo(original) {
  var param = {};
  var data = {
    raw: original,
    original: original,
    param: param
  };

  var key, val;
  for (key in original) {
    val = original[key];
    if (key in pmap) {
      data[pmap[key]] = val;
    } else if (key in mmap) {
      // 名字特殊处理的参数
      param[mmap[key]] = val;
    } else {
      // 其他参数都是将首字母转为小写
      key = key[0].toLowerCase() + key.slice(1);
      if (key === 'recongnition') {
        data.text = val;
      }
      param[key] = val;
    }
  }
  data.created = new Date(parseInt(original.CreateTime, 10) * 1000);
  return Info(data);
}

// keep the original watch method private,
// but accessible.
Webot.prototype._watch = Webot.prototype.watch;

Webot.prototype.watch = function(app, options) {
  options = options || {};

  if (typeof options === 'string') {
    options = {
      token: options
    };
  }

  var self = this;
  app.use(options.path || '/', wechat(options.token, function(req, res, next) {
    var info = normInfo(req.weixin);

    info.req = req;
    info.res = res;
    info.session = req.wxsession;

    self.reply(info, function(err, info) {
      if (info.noReply === true) {
        res.statusCode = 204;
        res.end();
        return;
      }
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
