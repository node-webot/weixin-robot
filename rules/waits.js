var douban = require('../lib/douban');

var user = require('../lib/user');
var cities = require('../data/cities');

var rules = {};

rules['search'] = {
  'tip': function(uid, info) {
    var q = info.param && info.param['q'] || info.text;
    var loc_id = info.param && info.param['loc'] || user(uid).loc();

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
};

module.exports = require('../lib/waiter')(rules);
