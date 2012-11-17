var data = require('../data');
var messages = data.messages;

var user = require('../lib/user');
var User = user.User;
var parser = require('../lib/parser');
var douban = require('../lib/douban');
var router = require('../lib/router')();

// Special type for location
router.set('location', function(info, next) {
  parser.geo2loc(info.param, function(loc_id) {
    info.param.loc = loc_id;
    if (loc_id) user(info.uid).setLoc(loc_id);
    return douban.nearby(info.param, next);
  });
});


function contains(str, p) {
  if (typeof p == 'string') {
    return str.indexOf(p) !== -1;
  } else {
    return str.search(p) !== -1;
  }
}

var dialogs = require('./dialogs');
// 先看一下是否可以直接对话 
router.set('dialog', {
  'handler': function(info) {
    var text = info['text'];
    if (text) {
      var r, ret;
      for (var i = 0, l = dialogs.length; i < l; i++) {
        r = dialogs[i];
        if (contains(text, r[0])) {
          ret = r[1];
          if (ret instanceof Array) return ret.sample(1)[0];
          if (typeof ret === 'function') return ret(info);
          return ret;
        }
      }
    }
  }
});

router.set('list', {
  'parser': function(info) {
    info.param = parser.listParam(info.text);
    return info;
  },
  'handler': function(info, next) {
    var uid = info.from;
    var u = new User(uid);

    // is waiting for user to reply a city name
    var want_city = this.waiter.reserve(uid) === 'search' && this.waiter.data(uid, 'want') === 'city';
    var loc = info.param && info.param['loc'];

    if (want_city && loc) {
      u.setLoc(loc);
      var q = this.waiter.data(uid, 'q');
      if (q) {
        this.waiter.pass(uid);
        info.param['q'] = q;
        info.ended = true;
        return douban.search(info.param, next);
      }
    }

    if (loc) {
      u.setLoc(loc);
      cb(loc);
    } else {
      u.getLoc(function(err, loc) {
        if (loc) {
          info.param['loc'] = loc;
          u.setLoc(loc);
        }
        cb(loc);
      });
    }

    function cb(loc) {
      if (!loc) return next('CITY_404');

      // 如果有搜索关键字
      if (info.param['type'] && info.param['q']) {
        info.ended = true;
        return douban.search(info.param, next);
      }
      if (info.param['q']) {
        next();
        return;
      }
      douban.list(info.param, next);
    }
  }
});
// 最后提示是否搜索
router.set('short_text', {
  'pattern': function(info) {
    var text = info.param && info.param['q'] || info.text;
    return text.length > 1 && text.length < 8;
  },
  'handler': function(info, next) {
    var tip = this.waiter.reserve(info.from, 'search', info);
    next(null, tip);
  }
});

module.exports = router;
