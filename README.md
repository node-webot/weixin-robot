# 微信公共帐号机器人(Weixin Robot) [![Build Status](https://api.travis-ci.org/ktmud/weixin-robot.png?branch=master)](https://travis-ci.org/ktmud/weixin-robot)

[微信公众平台](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-index&lang=zh_CN)提供的[开放信息接口](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-callbackapi-doc&lang=zh_CN)的自动回复系统，基于`node.js` 实现。

## 功能：

1. 清晰独立的 router ，轻松实现文本匹配流程控制
2. 基于正则表达式的对话设定，配置简单，可以给一句话随机回复不同内容
3. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”

添加微信帐号,试试效果

![豆瓣同城微信帐号二维码：douban-event](http://i.imgur.com/ijE19.jpg)
![微信机器人测试帐号：webot-test](http://i.imgur.com/6IcAJgH.jpg)

## 快速入门

```javascript
var express = require('express');
var webot = require('weixin-robot');

var app = express();

// 指定回复消息
webot.set('hi', '你好');

// 接管消息请求
webot.watch(app, 'your1weixin2token');

// 启动 Web 服务
// 微信后台只允许 80 端口
app.listen(80);

// 如果你不想让 node 应用直接监听 80 端口
// 可以尝试用 nginx 或 apache 自己做一层 proxy
// app.listen(process.env.PORT);
// app.enable('trust proxy');
```

## 示例


如果一切顺利，你也搭建好了自己的机器人，欢迎到[此项目的 Wiki 页面](https://github.com/ktmud/weixin-robot/wiki/%E4%BD%BF%E7%94%A8%E6%AD%A4%E7%B3%BB%E7%BB%9F%E7%9A%84%E5%BE%AE%E4%BF%A1%E5%B8%90%E5%8F%B7)添加你的帐号。

## 贡献代码

欢迎直接 fork 并提交 pull request ，提交前请确保 make test 能通过。

更欢迎直接[认领 issues](https://github.com/ktmud/weixin-robot/issues?state=open)。

# API 参考

## Webot (机器人)

### set(pattern, handler, _[, replies]_)

新增回复规则

```javascript
webot.set(pattern, handler, replies)

// or 

webot.set({
  name: 'rule name',
  pattern: function(info, next) { ... },
  handler: function(info, next) {
  }
})
```

### wait(uid, rule)

等待用户回复。 `rule` 可以是一个 function ，也可以类似于 `webot.set` 参数的具体规则定义。

### rewait(uid)

重试上次等待操作

### dialog(file1, _[file2, ...]_)

增加对话规则

```javascript
webot.dialog({
  'hello': '哈哈哈',
  'hi': ['好吧', '你好']
});

// or
webot.dialog('./rules/foo.js', './rules/bar.js');
```

In `rules/foo.js`:

```javascript
module.exports = {
  'hello': '哈哈哈',
  'hi': ['好吧', '你好']
};
```

你也可以在你的项目中 `require('js-yaml')` ，
采用简洁的 yaml 语法来定义纯文本的对话规则：

In `package.json`:
```javascript
   "dependencies": {
       ...
     "js-yaml": "~2.0.3"
       ...
   }
```

In your `app.js`:

```javascript
require('js-yaml');

webot.dialog('./rules/abc.yaml');
```

In `rules/abc.yaml`:

```yaml
---
# 直接回复
hi: 'hi,I am robot'

# 随机回复一个
hello: 
  - 你好
  - fine
  - how are you

# 匹配组替换
/key (.*)/i: 
  - '你输入的匹配关键词是:{1}'
  - '我知道了,你输入了:{1}'

# 也可以是一个rule定义；如果没有定义pattern，自动使用key
yaml:
  name: 'test_yaml_object'
  handler: '这是一个yaml的object配置'
```
      

## Rule(options)

使用 `webot.set` 和 `webot.wait` 等方法时，会自动新建一条 rule ，
rule 定义的具体可用参数如下：

### options.name

为规则命名，仅在在调试和后台查看（计划中）时有用。

### options.pattern
 
匹配消息文本的方法。可以是正则表达式或函数。

支持的格式:
 
 - {String}   直接返回字符串
 - {RegExp}   仅匹配文本消息正则式，匹配到的捕获组会被赋值给 info.param
 - {Function} 签名为fn(info):boolean
 - {NULL}     为空则视为通过匹配

示例：

```javascript
webot.set({
  name: 'your_name',
  description: '自我介绍下吧, 发送: I am [enter_your_name]',
  pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
  // handler: function(info, rule){
  //   return '你好,' + info.param[1]
  // }
  
  //或者更简单一点
  handler: '你好,{1}'
});

//pattern支持函数
webot.set({
  name: 'pattern_fn',
  description: 'pattern支持函数,发送: fn',
  pattern: function(info){
    return info.isText() && info.text=='fn'
  },
  handler: 'pattern支持函数'
});
```

### options.handler

指定如何生成回复消息

当返回非真值(null/false)时继续执行下一个动作，否则返回值会被回复给用户。

支持的格式:

- {String}    直接返回字符串
- {Array}     直接返回数组中的随机子元素
- {Function}  签名为fn(info):String 直接执行函数并返回
- {Function}  签名为fn(info, callback(err, reply)) 通过回调函数返回
- {Object}    key为pattern,value为handler, 根据匹配的正则去执行对应的handler (注意: 因为是Object,所以执行顺序不一定从上到下)

示例：

```javascript
webot.set({
  name: 'your_name',
  description: '自我介绍下吧, 发送: I am [enter_your_name]',
  pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,

  // handler: function(info, rule){
  //   return '你好,' + info.query[1]
  // }
  handler: '你好,{1}'
});

// 异步操作
webot.set({
  name: 'search_database',
  description: 'Search a keyword from database',
  pattern: /^(?:s\s+)(.+)$/i,
  handler: function(info, next) {

    // assert(this.name == 'search_database');
    // 函数内的 this 变量即此规则

    query_from_database(info.text, function(err, ret) {
      if (err) return next(500);
      return next(null, ret);
    });
  }
});
```

**注意**：`pattern` 并不支持异步，你可以把需要异步进行的 pattern 匹配
视为一个 `handler` 。

```javascript
webot.set('test', function(info, next) {
  var uid = info.user;
  User.findOne(uid, function(err, doc) {
    if (!doc) return next();
    return next(null, '欢迎，' + doc.name);
  });
});
```

### replies

指定如何回复用户的回复。

```javascript
// 等待下一次回复
webot.set({
  name: 'ask_sex',
  description: '发送: sex? ,然后再回复girl或boy或both或其他',
  pattern: /^sex\??$/i,
  handler: '你猜猜看',
  //下次回复动作,replies,可以是任何能转换为rule数组的对象,如Object,Array,String,Function等
  //object格式,key为pattern,value为handler, 注意object是没有顺序的
  replies: {
    //正则作为key的时候,注意要转义
    '/^g(irl)?\\??$/i': '猜错',
    'boy': function(info, next){
      // 可以通过 this.parent 获得父级 rule 定义
      return next(null, '猜对了')
    },
    'both': '对你无语...'
  }
  
  //也可以是直接的函数,同rule: function(info, [cb]) 
  // replies: function(info){
  //   return 'haha, I wont tell you'
  // }

  //也可以是数组格式,每个元素为一个rule
  // replies: [{
  //   pattern: '/^g(irl)?\\??$/i',
  //   handler: '猜错'
  // },{
  //   pattern: '/^b(oy)?\\??$/i',
  //   handler: '猜对了'
  // },{
  //   pattern: 'both',
  //   handler: '对你无语...'
  // }]
});
```


## Info

负责解析微信发来的消息，以及打包回复消息。

###原始消息属性

```javascript
    /**
     * @cfg {String} 消息类型:
     *
     * - text: 文本消息
     * - location: 位置消息
     * - image: 图片消息
     */
    Info.prototype.type = 'text';

    /**
     * @cfg {String} 普通用户的微信号
     * 对应于原始字段: FromUserName
     */
    Info.prototype.user = null;

    /**
     * @cfg {String} 公众帐号的微信号
     * 对应于原始字段: ToUserName
     */
    Info.prototype.sp = null;

    /**
     * @cfg {Number} 消息接收时间,timestamp格式
     * 对应于原始字段: CreateTime
     */
    Info.prototype.createTime = null;

    /**
     * @cfg {String} 消息内容
     * 对应于原始字段: Content
     */
    Info.prototype.text = null;

    /**
     * @cfg {String} 纬度
     * 对应于原始字段: Location_X
     */
    Info.prototype.lat = null;

    /**
     * @cfg {String} 经度
     * 对应于原始字段: Location_Y
     */
    Info.prototype.lng = null;

    /**
     * @cfg {String} 地图缩放大小
     * 对应于原始字段: Scale
     */
    Info.prototype.scale = null;

    /**
     * @cfg {String} 地理位置信息
     * 对应于原始字段: Label
     */
    Info.prototype.label = null;

    /**
     * @cfg {String} 图片URL,需通过HTTP GET获取
     * 对应于原始字段: PicUrl
     */
    Info.prototype.pic = null;
```

###回复消息属性

```javascript
    /**
     * @property {String/Array} reply 回复消息
     * 
     * 支持格式(2选1):
     * 
     * - {String} 回复文字消息,大小限制在2048字节
     * - {Array}  回复多条图文消息信息. 默认第一个item为大图,限制为10条以内.
     * 
     *   - {String} title 图文消息标题
     *   - {String} description 图文消息描述
     *   - {String} pic 图片链接,支持JPG、PNG格式,较好的效果为大图(640x320),小图(80x80),
     *              限制图片链接的域名需要与开发者填写的基本资料中的Url一致
     *   - {String} url 点击图文消息跳转链接
     *
     *   注: 提供了映射功能,参见 {@link #config}
     */
    Info.prototype.reply = null;

    /**
     * @property {Number} 回复消息用的属性,对消息进行星标
     * 
     * - 星标: 1
     * - 不星标: 0
     */
    Info.prototype.flag = 0;
```

### toXML()

把回复消息打包成XML


## 测试辅助：

提供可执行文件 `webot` 用于发送测试消息。

```
  Usage: webot [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -l, --location             Send a <location> (geo, latlng)
    -i, --image                Send a <image>, provide image url
    -t, --token [value]        Provide weixin token
    -n, --host [value]         Set request hostname, defaults to 127.0.0.1
    -p, --port <n>             The port your service is listening to, defaults to 3000
    -r, --route <n>            The route path, defaults to root path
    -d, --destination [value]  The request destination url, will override "host" and "port"
    -s, --sp [value]           The SP ID
    -u, --user [value]         The User ID
```

Have fun with wechat, and enjoy being a robot!

## LICENSE

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
