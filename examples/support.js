var debug = require('debug');
var log = debug('webot:example');

var _ = require('underscore')._;
var request = require('request');

/**
 * 通过高德地图API查询用户的位置信息
 * @param  {Info}     info          消息类
 * @param  {Function} cb            回调函数
 * @param  {Error}    cb.err        错误信息
 * @param  {String}   cb.location   用户所在地市
 * @param  {Object}   cb.data       查询API返回的JSON
 */
exports.geo2loc = function geo2loc(info, cb){
  var options = {
    url: 'http://restapi.amap.com/rgeocode/simple',
    qs: {
      resType: 'json',
      encode: 'utf-8',
      range: 3000,
      roadnum: 0,
      crossnum: 0,
      poinum: 0,
      retvalue: 1,
      sid: 7001,
      region: [info.lng, info.lat].join(',')
    }
  };
  log('querying amap for: [%s]', options.qs.region);

  //查询
  request.get(options, function(err, res, body){
    if(err){
      error('geo2loc failed', err);
      return cb(err);
    }
    var data = JSON.parse(body);
    if(data.list && data.list.length>=1){
      data = data.list[0];
      var location = data.city.name || data.province.name;
      log('location is %s, %j', location, data);
      return cb(null, location, data);
    }
    log('geo2loc found nth.');
    return cb('geo2loc found nth.');
  });
};

/**
 * 搜索百度
 *
 * @param  {String}   keyword 关键词
 * @param  {Function} cb            回调函数
 * @param  {Error}    cb.err        错误信息
 * @param  {String}   cb.result     查询结果
 */
exports.search = function(keyword, cb){
  log('searching: ' + keyword);
  var options = {
    url: 'http://www.baidu.com/s',
    qs: {
      wd: keyword
    }
  };
  request.get(options, function(err, res, body){
    if (err || !body){
      return cb(null, '现在暂时无法搜索，待会儿再来好吗？');
    }
    var regex = /<h3 class="t">\s*(<a.*?>.*?<\/a>).*?<\/h3>/gi;
    var links = [];
    var i = 1;

    while (true) {
      var m = regex.exec(body);
      if (!m || i > 5) break;
      links.push(i + '. ' + m[1]);
      i++;
    }

    var result;
    if (links.length) {
      result = '在百度搜索:' + keyword +',得到以下结果：\n' + links.join('\n');
      result = result.replace(/\s*data-click=".*?"/gi,  '');
      result = result.replace(/\s*onclick=".*?"/gi,  '');
      result = result.replace(/\s*target=".*?"/gi,  '');
      result = result.replace(/<em>(.*?)<\/em>/gi,  '$1');
      result = result.replace(/<font.*?>(.*?)<\/font>/gi,  '$1');
      result = result.replace(/<span.*?>(.*?)<\/span>/gi,  '$1');
    } else {
      result = '搜不到任何结果呢';
    }

    // result 会直接作为
    // robot.reply() 的返回值
    //
    // 如果返回的是一个数组：
    // result = [{
    //   pic: 'http://img.xxx....',
    //   url: 'http://....',
    //   title: '这个搜索结果是这样的',
    //   description: '哈哈哈哈哈....'
    // }];
    //
    // 则会生成图文列表
    return cb(null, result);
  });
};

/**
 * 下载图片
 *
 * 注意:只是简陋的实现,不负责检测下载是否正确,实际应用还需要检查statusCode.
 * @param  {String} url  目标网址
 * @param  {String} path 保存路径
 */
exports.download = function(url, path){
  log('downloading %s to %s', url, path);
  request(url).pipe(require('fs').createWriteStream(path));
};