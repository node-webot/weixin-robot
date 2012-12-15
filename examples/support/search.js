// webot 自带一个简单的网络请求方法
var request = require('../../lib/weixin').request;

function do_search(param, next) {
  request('http://www.baidu.com/s', {
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

module.exports = do_search;
