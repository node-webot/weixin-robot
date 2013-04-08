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

请参考[weixin-robot-example](https://github.com/ktmud/weixin-robot-example)。

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

我们建议你给每条规则都命名，以方便后台查看和维护。

```javascript
webot.set('rule A', {
  pattern: /ruleA/,
  handler: function() {
  },
});

// 可以省略 rule name ,
// 直接用 match pattern 当名字
webot.set('你好', function() {
  // 随机回复一句话
  return ['你也好', '你好', '很高兴认识你'];
});
```

你甚至还可以直接传入一个 Object ，
其 key 为 pattern ， value 为 handler 
（只要里面不包括 'handler' 这个 key）：

```javascript
webot.set({
  '你好':  function() {
    // 随机回复一句话
    return ['你也好', '你好', '很高兴认识你'];
  },
  '你是谁': '我是你的小天使呀'
});
```

### wait(uid, rule)

等待用户回复。并且根据 `rule` 定义来回复用户。`rule` 可以是一个 function 或 object。
用法与 `webot.set` 的参数类似。

### rewait(uid)

重试上次等待操作。一般在 `replies` 的 handler 里调用。

此为高级功能，具体用法请参看[示例](https://github.com/ktmud/weixin-robot-example)。

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

#### 使用YAML

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
 
匹配用户发送的消息的方法。如果为正则表达式和字符串，
则只在用户发送的时文本消息时才匹配。

所有支持的格式：
 
```
 {String}   如果是潜在的 RegExp （如 '/abc/igm' ），会被转为 RegExp 
            如果以 '#' 打头，则完全匹配，否则模糊匹配
 {RegExp}   仅匹配文本消息正则式，匹配到的捕获组会被赋值给 info.param
 {Function} 第一个参数为 info ，返回布尔值，可用以处理特殊类型的消息
 {NULL}     为空则视为通过匹配
```

示例：

```javascript
webot.set('your name', {
  pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
  // handler: function(info, rule){
  //   return '你好,' + info.param[1]
  // }
  // 或者更简单一点
  handler: '你好,{1}'
});

webot.set('pattern as fn', {
  pattern: function(info){
    return info.isText() && info.text=='fn'
  },
  handler: 'pattern支持函数'
});

webot.set('pattern as fn', {
  pattern: '#a',
  handler: '只有回复「a」时才会看到本消息'
});

```

### options.handler

指定如何生成回复消息

当返回非真值(null/false)时继续执行下一个动作，否则返回值会被回复给用户。

支持的定义格式:

- {String}    直接返回字符串
- {Array}     从数组中随机取一个作为 handler
- {Object}    尝试生成为单条图文消息
- {Function}  执行函数获取返回值

支持异步：

```javascript

webot.set('search database', {
  description: 'Search a keyword from database',
  pattern: /^(?:s\s+)(.+)$/i,
  handler: function(info, next) {
    // assert(this.name == 'search_database');
    // 函数内的 this 变量即此规则

    // 执行一个异步操作..
    query_from_database(info.text, function(err, ret) {
      if (err) return next(500);
      return next(null, ret);
    });
  }
});
```

handler 可用的返回值：

  - {false|null|undefined|''}  进入下一条规则
  - {String}                   回复为文本消息
  - {Object}                   回复为图文消息
  - {Array}                    回复为(多)图文消息

### 星标消息

微信允许你在回复消息时标记一个 `FuncFlag` ，可以在公共平台后台的「星标消息」中查看带标记的消息。
适合你的机器人无法回复时使用。你只需在 handler 中给 `info.flag` 赋值 `true` 即可。

```javascript
// 把这句放到你的规则的最末尾
webot.set('fallback', {
  pattern: /.*/,
  handler: function(info) {
    info.flag = true;
    return ['唔.. 暂时听不懂您说的什么呢',
    '不好意思，我不太懂您说的什么意思',
    '哎呀，听不懂啦！', 
    '这个我不是很懂，不如我们聊点别的吧？']
  }
});
```

**注意**：`pattern` 并不支持异步，你可以把需要异步进行的 pattern 匹配
视为一个 `handler` 。此时，你只需在定义规则时省略钓 `pattern` 定义即可。

```javascript
webot.set('test', function(info, next) {
  var uid = info.user;
  User.findOne(uid, function(err, doc) {
    if (!doc) return next();
    return next(null, '欢迎，' + doc.name);
  });
});
```

### options.replies

指定如何回复用户的回复。即用户回复根据当前规则回复的消息后，如何再次回复用户。

```javascript
webot.set('guess my sex', {
  pattern: /是男.还是女.|你.*男的女的/,
  handler: '你猜猜看呐',
  replies: {
    '/女|girl/i': '人家才不是女人呢',
    '/男|boy/i': '是的，我就是翩翩公子一枚',
    'both|不男不女': '你丫才不男不女呢',
    '不猜': '好的，再见',
    '/.*/': function(info) {
      // 在 replies 的 handler 里可以获得等待回复的重试次数参数
      if (info.rewaitCount < 2) {
        webot.rewait(info.user);
        return '你到底还猜不猜嘛！';
      }
      return '看来你真的不想猜啊';
    },
  }
  
  // 也可以用一个函数搞定:
  // replies: function(info){
  //   return 'haha, I wont tell you'
  // }

  // 也可以是数组格式，每个元素为一条rule
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
