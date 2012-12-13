// 在真实环境中使用时请使用 require('weixin-robot');
var webot = require('../lib/weixin');
var router = webot.router();
var geo2loc = webot.geo2loc;

// 扫描指定目录内的指定对话配置文件
// 对于 js 文件，请直接返回对话 Array
// 对于文本文件，用空行分隔多个对话回复
// 具体写法参考相应 `./dialogs/` 目录下的 .txt 文件
var dialogs = webot.dialogs({
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
  // 指定如何回复
  'handler': function(info, next) {
    // 如果给传入的 request info 标记 ended，
    // 则不会进去下一个route（如果有的话）
    info.ended = true;
    next(null, '你也好哈');
  }
});

var reg_search_cmd = /^(搜索|search)\s*(.+)/i;
router.set('search', {
  // 匹配消息的方法，可以是正则，也可以是 function
  'pattern': reg_search_cmd,
  //'pattern': function(info) {
    //return reg_search_cmd.test(info.text);
  //},
  // 如何分析文本参数
  'parser': function(info) {
    // 匹配到的关键词
    info.q = info.text.match(reg_search_cmd)[2];

    // 这句不是必须的
    // 你也可以 return 一个新的 info 对象
    return info;
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
    do_search({ q: info.q }, next);

    // handler 内部的 this 关键字即此 router
    //
    // 可以使用 router.waiter 获取到对应的 waiter ，
    // 并通过 waiter.reserve 方法
    // 实现 router 与 waiter 的联动
    //
    //   var tip = this.waiter.reserve(info.from, 'some-wait-action');
    //   return next(null, tip);
    // 
    // 当然，如果 wait action 指定了 pattern ，
    // 可以不用在 router 里手动 reserve
    // 所有routes跑完之后，会继续尝试匹配waites
  }
});

function do_search(param, next) {
  // webot 自带一个简单的网络请求方法
  webot.request('http://www.baidu.com/s', {
    wd: param.q
  }, function(err, res) {
    if (err || !res) return next(null, '现在暂时无法搜索，待会儿再来好吗？');

    // 为了兼容不同编码，res 默认是一个 Buffer
    // 调用 toString 方法，转换为 utf-8 的字符串
    res = res.toString();

    var reg_h3t = /<h3 class="t">\s*(<a.*?>.*?<\/a>).*?<\/h3>/gi;
    var links = [];
    var i = 1;

    while (true) {
      var m = reg_h3t.exec(res);
      if (!m || i > 5) break;
      links.push(i + '. ' + m[1]);
      i++;
    }

    var ret;
    if (links.length) {
      ret = '在百度搜索到以下结果：\n' + links.join('\n');
      ret = ret.replace(/\s*data-click=".*?"/gi,  '');
      ret = ret.replace(/\s*onclick=".*?"/gi,  '');
      ret = ret.replace(/\s*target=".*?"/gi,  '');
      ret = ret.replace(/<em>(.*?)<\/em>/gi,  '$1');
      ret = ret.replace(/<font.*?>(.*?)<\/font>/gi,  '$1');
      ret = ret.replace(/<span.*?>(.*?)<\/span>/gi,  '$1');
    } else {
      ret = '搜不到任何结果呢';
    }

    // ret 会直接作为
    // robot.reply() 的返回值
    //
    // 如果返回的是一个数组：
    // ret = [{
    //   pic: 'http://img.xxx....',
    //   url: 'http://....',
    //   title: '这个搜索结果是这样的',
    //   desc: '哈哈哈哈哈....'
    // }];
    //
    // 则 webot.makeMessage 的时候会生成图文列表
    next(null, ret);
  });
}

module.exports = router;
