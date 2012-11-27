var weixin = require('../lib/weixin');
var router = weixin.router();
var geo2loc = weixin.geo2loc;

var dialogs = weixin.dialogs({
  dir: __dirname + '/' + 'dialogs',
  files: ['basic', 'greetings.js', 'gags']
});
// dialogs 就是一个Array
// 类似于：
// [
//   ['你好', '你也好'],
//   ['我叫(.*)', '你好，\1']
// ]
router.dialog(dialogs);

// Special type for location
router.set('location', function(info, next) {
  // 已经提供了geo转地址的工具，使用的是高德地图的API
  geo2loc(info.param, function(loc_info) {
    if (!loc_info) return '我不知道你在什么地方。';
    return '你正在' + loc_info['addr'];
  });
});

module.exports = router;
