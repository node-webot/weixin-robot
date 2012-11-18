var douban = require('../lib/douban');

var user = require('../lib/user');
var cities = require('../data/cities');
var waiter = require('../lib/waiter')();

waiter.set('who_create', {
  pattern: /(你是(谁(制造|生出来|制作|设计|创造)(的|了)))|\2你/,
  tip: '一个很猥琐的程序员，要我把他的微信号告诉你吗？',
  'replies': {
    'Y': '好的，他的微信帐号是：YjgxNTQ5ZmQzYTA0OWNjNTQ3NzliNGMyNzRmYjdhMTUK',
    'N': '可惜了啊，其实他还长得蛮帅的' 
  }
});

waiter.set('search', {
  'pattern': function(info) {
    console.log(info);
    var text = info.param && info.param['q'] || info.text;
    return text.length > 1 && text.length < 8;
  },
  'tip': function(uid, info) {
    var q = info.param && info.param['q'] || info.text;
    var loc_id = info.param && info.param['loc'];

    // save user data
    this.data(uid, { 'q': q, 'loc': loc_id });

    if (loc_id) {
      return '要我在' + cities.id2name[loc_id] + '搜索“' + q + '”相关的活动吗？回复“要”或“不要”';
    } else {
      this.data(uid, 'want', 'city');
      return '告诉我你所在的城市，我就可以帮你查找“' + q + '”相关的活动';
    }
  },
  'replies': {
    'Y': function(uid, info, cb) {
      var d = this.data(uid);
      if (!d['loc'] || !d['q']) return true;
      return douban.search(d, cb);
    },
    'N': '好的，你说不要就不要' 
  }
});

module.exports = waiter;
