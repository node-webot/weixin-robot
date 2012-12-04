var weixin = require('../lib/weixin');
var router = weixin.router();
var geo2loc = weixin.geo2loc;

var dialogs = weixin.dialogs({
  dir: __dirname + '/' + 'dialogs',
  files: ['basic', 'greetings.js', 'gags']
});
// 生成的dialogs 就是一个Array
// 类似于：
// [
//   ['你好', '你也好'],
//   [/我叫(.*)/, '你好，\1']
// ]
router.dialog(dialogs);

// 'location' 是保留字，用作用户发送位置的情况
router.set('location', function(info, next) {
  // 已经提供了geo转地址的工具，使用的是高德地图的API
  geo2loc(info.param, function(loc_info) {
    if (!loc_info) return '我不知道你在什么地方。';
    return '你正在' + loc_info['addr'];
  });
});

// 为每个route命名，暂时只是为了好看
router.set('say_hi', {
  'pattern': /^Hi/i,
  'handler': function(info, next) {
    // 如果给传入的 request info 标记 ended，
    // 则不会进去下一个route（如果有的话）
    info.ended = true;
    next(null, '你也好哈');
  }
});

var reg_search_cmd = /^(搜索|search)\s*(.+)/i
router.set('search', {
  'pattern': reg_search_cmd,
  'parser': function(info) {
    // 匹配到的关键词
    info.q = info.text.match(reg_search_cmd)[2];
  },
  // parser 也是可以异步的，error 可以忽略，
  //'parser': function(info, next) {
  //  SomeQueryToDatabase(function(err, ret) {
  //    // err 可直接忽略，如果确已出错，
  //    // 可以指定:
  //    //  info.ended = true;
  //    //  info.err = '获取数据出错..';
  //    info._data = ret;
  //    return next(info);
  //  });
  //},
  'handler': function(info, next) {
    // 从某个地方搜索到数据...
    do_search({ q: info.q }, function(err, items) {
      // 给 reques info 里面添加图文列表所需内容
      next(null, items);
    });
  }
});

// 怎么搜索，自己实现吧...
function do_search(param, next) {
  // code...
  var ret = [{
    pic: 'http://img.xxx....',
    url: 'http://....',
    title: '这个搜索结果是这样的'
    desc: '哈哈哈哈哈....'
  }];
  next(null, ret);
}

module.exports = router;
