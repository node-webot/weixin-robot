# 微信公共帐号机器人(Weixin Robot) [![Build Status](https://api.travis-ci.org/ktmud/weixin-robot.png?branch=master)](https://travis-ci.org/ktmud/weixin-robot)

A node.js robot for wechat.

[微信公众平台](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-index&lang=zh_CN)提供的[开放信息接口](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-callbackapi-doc&lang=zh_CN)的自动回复系统，基于`node.js` 实现。

## 功能特色：

1. 方便灵活的规则定义，轻松实现文本匹配流程控制
2. 基于正则表达式的对话设定，配置简单，可以给一句话随机回复不同内容
3. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”

## 使用示例：

请参考 [weixin-robot-example](https://github.com/ktmud/weixin-robot-example)
的 [rules.js](https://github.com/ktmud/weixin-robot-example/blob/master/rules.js) 文件。

添加微信帐号，试试效果：

![豆瓣同城微信帐号二维码：douban-event](http://i.imgur.com/ijE19.jpg)
![微信机器人测试帐号：webot-test](http://i.imgur.com/6IcAJgH.jpg)

## 快速入门 | [FAQ](https://github.com/ktmud/weixin-robot/wiki/FAQ)

```javascript
var express = require('express');
var webot = require('weixin-robot');

var app = express();

// 指定回复消息
webot.set('hi', '你好');

webot.set('subscribe', {
  pattern: function(info) {
    return info.event === 'subscribe';
  },
  handler: function(info) {
    return '欢迎订阅微信机器人';
  }
});

// 接管消息请求，第二个参数为你在微信后台填写的 token 地址
webot.watch(app, 'your1weixin2token');

// 启动 Web 服务
// 微信后台只允许 80 端口
app.listen(80);

// 如果你不想让 node 应用直接监听 80 端口
// 可以尝试用 nginx 或 apache 自己做一层 proxy
// app.listen(process.env.PORT);
// app.enable('trust proxy');
```

如果一切顺利，你也搭建好了自己的机器人，欢迎到[此项目的 Wiki 页面](https://github.com/ktmud/weixin-robot/wiki/%E4%BD%BF%E7%94%A8%E6%AD%A4%E7%B3%BB%E7%BB%9F%E7%9A%84%E5%BE%AE%E4%BF%A1%E5%B8%90%E5%8F%B7)添加你的帐号。

## 贡献代码

欢迎直接 fork 并提交 pull request ，提交前请确保 make test 能通过。
如果是新加功能，请补全测试用例。

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
  pattern: function(info) { ... },
  handler: function(info, next) {
  }
})
```

我们建议你给每条规则都命名，以方便规则之间互相调用。

```javascript
webot.set('rule A', {
  pattern: /ruleA/,
  handler: function() {
  },
});

// webot.get('rule A') 即可获得刚才定义的规则

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
 
- {String}   如果是潜在的 RegExp （如 '/abc/igm' ），会被转为 RegExp，如果以 '#' 打头，则完全匹配，否则模糊匹配
- {RegExp}   仅匹配文本消息正则式，匹配到的捕获组会被赋值给 info.param
- {Function} 只接受一个参数 info ，返回布尔值，可用以处理特殊类型的消息
- {NULL}     为空则视为通过匹配

示例：

```javascript
// 匹配下列所有消息：
//
//    你是机器人吗
//    难道你是机器人？
//    你是不是机器人？
//    ...
//
webot.set('Blur match', {
  pattern: '是机器人',
  handler: '是的，我就是一名光荣的机器人'
});

// 当字符串 pattern 以 "=" 开头时，需要完全匹配
webot.set('Exact match', {
  pattern: '=a',
  handler: '只有回复「a」时才会看到本消息'
});

// 利用正则来匹配
webot.set('your name', {
  pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
  handler: '你好,{1}'
});

// 类正则的字符串会被还原为正则 
webot.set('/(good\s*)morning/i', '早上好，先生');

// 可以接受 function
webot.set('pattern as fn', {
  pattern: function(info){
    return info.eventKey === 'subscribe';
  },
  handler: '你好，欢迎关注我'
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

webot.set('search_database', {
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
适合你的机器人不懂如何回复用户消息时使用。
你只需在 handler 中给 `info.flag` 赋值 `true` 即可。

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

指定如何**再次回复用户的回复**。即用户回复了根据当前规则回复的消息后，如何继续对话。

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
  //   return '嘻嘻，不告诉你'
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

### 请求消息属性

与[微信官方文档](http://mp.weixin.qq.com/wiki/index.php?title=%E6%B6%88%E6%81%AF%E6%8E%A5%E5%8F%A3%E6%8C%87%E5%8D%97#.E6.B6.88.E6.81.AF.E6.8E.A8.E9.80.81)中的xml参数保持一致：

    ToUserName      开发者微信号
    FromUserName    发送方帐号（一个OpenID）
    CreateTime      消息创建时间 （整型）
    MsgId           消息id
    MsgType         text / image / location / link / event

    // MsgType == text
    Content         文本消息内容

    // MsgType == image
    PicUrl          图片链接

    // MsgType == location
    Location_X      地理位置纬度
    Location_Y      地理位置经度
    Scale           地图缩放大小
    Label  地理位置信息

    // MsgType == link
    Title           消息标题
    Description     消息描述
    Url             消息链接

    // MsgType == event
    Event           事件类型，subscribe(订阅)、unsubscribe(取消订阅)、CLICK(自定义菜单点击事件)
    EventKey        事件KEY值，与自定义菜单接口中KEY值对应

### info.reply

给 `info.reply` 赋值后，即可调用 `info.toXML()` 方法把消息打包成回复给微信服务器的 XML 内容。
一般来说，你只需在 `rule.handler` 的返回值或 callbak 里提供回复消息的内容，
`webot.watch` 自带的 express 中间件（即 `webot.watch` ）会自动帮你完成打包操作。

支持的数据类型：

- {String}   直接回复文本消息，不能超过2048字节
- {Object}   单条 图文消息/音乐消息
- {Array}    多条图文消息

#### 回复文本消息

```javascript
info.reply = '收到你的消息了，谢谢'
```

#### 回复图文消息

    title        消息标题
    url          消息网址
    description  消息描述
    picUrl       消息图片网址


```javascript
info = {
  title: '消息标题',
  url: 'http://example.com/...',
  picUrl: 'http://example.com/....a.jpg',
  description: '对消息的描述出现在这里',
}

// or

info = [{
  title: '消息1',
  url: 'http://example.com/...',
  picUrl: 'http://example.com/....a.jpg',
  description: '对消息的描述出现在这里',
}, {
  title: '消息2',
  url: 'http://example.com/...',
  picUrl: 'http://example.com/....a.jpg',
  description: '对消息的描述出现在这里',
}]
```

### 回复音乐消息

    url          音乐链接
    hq_url       高质量音乐链接，wifi 环境下会优先使用该链接播放音乐

需指定 `reply.type` 为 `'music'`：

```javascript
info.reply = {
  type: 'music',
  url: 'http://....x.mp3',
  hq_url: 'http://....x.m4a'
}
```

### info.flag

是否标记为星标消息，可以在微信公共平台后台看到所有星标消息和星标用户分组。

### info.toXML([mapping])

根据 `info.reply` 打包回复消息为 XML 字符串。
可选参数 `mapping` 指定如何对消息对象进行再包装。

`mapping` 可以是：

- {Function}  对每一条图文消息（item）都执行 `mapping(item, i, info)`
- {Object}    标准属性值与回复对象属性值的对应关系

如
```javascript
var mapping = {
  pic: 'image',
  description: 'desc'
};

var reply = {
  title: '《奇迹之书》',
  url: 'http://book.douban.com/...',
  author: '谁谁谁',
  desc: '本书由谁谁谁编写',
  image: 'http://......'
};

// reply 会被标准化为
{
  title: '《奇迹之书》',
  url: 'http://book.douban.com/...',
  description: '本书由谁谁谁编写',
  pic: 'http://......'
};
```

非常适用于从第三方 API 取到的数据对象标准值和微信图文消息需要的不一样，但是又不想重新处理的情况。

### info.data(key, _[val]_)

暂存或获取用户信息。使用方法与 jquery 的 `data` 类似。
默认存在内存里，服务重启后失效。
如果提供了 session 配置，会存在 session 里。

### info.wait(rule)

等待用户回复。并根据 `rule` 定义来回复用户。
`rule` 可以是一个 function 或 object。
用法与 `webot.set` 的参数类似。

### info.rewait()

重试上次等待操作。一般在 `replies` 的 handler 里调用。

以上两个方法为高级功能，具体用法请参看[示例](https://github.com/ktmud/weixin-robot-example)。


## 命令行工具

提供可执行文件 `webot` 用于发送测试消息。
使用 `npm` 安装 [webot-cli](https://github.com/ktmud/webot-cli)：

    npm install webot-cli -g

Have fun with wechat, and enjoy being a robot!

## LICENSE

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
