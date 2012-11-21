// Special type for location
var weixin = require('../lib/weixin');
var router = weixin.router();
var geo2loc = weixin.geo2loc;
var dialogs = weixin.dialogs({
  dir: __dirname + '/' + 'dialogs',
  files: ['greetings.js', 'gags']
});

router.dialog(dialogs);

router.set('location', function(info, next) {
  geo2loc(info.param, function(loc_info) {
    if (!loc_info) return '我不知道你在什么地方。';
    return '你正在' + loc_info['addr'];
  });
});

module.exports = router;
