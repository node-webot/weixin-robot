# 微信公共帐号机器人(Weixin Robot) [![Build Status](https://api.travis-ci.org/ktmud/weixin-robot.png?branch=master)](https://travis-ci.org/ktmud/weixin-robot)

[微信公众平台](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-index&lang=zh_CN)提供的[开放信息接口](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-callbackapi-doc&lang=zh_CN)的自动回复系统，基于`node.js` 实现。

## 功能：

1. 清晰独立的 router ，轻松实现文本匹配流程控制
2. 基于正则表达式的对话设定，配置简单，可以给一句话随机回复不同内容
3. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”

添加微信帐号,试试效果

![豆瓣同城微信帐号二维码：douban-event](http://i.imgur.com/ijE19.jpg)
![微信机器人测试帐号：webot](https://raw.github.com/ktmud/weixin-robot/master/examples/qrcode.jpg)

## Install:
    npm install weixin-robot

  或者访问官网: [https://github.com/ktmud/weixin-robot](https://github.com/ktmud/weixin-robot)

## QuickStart

WeBot的设计目标就是让你傻瓜化的接入微信公众平台

    //启动服务
    var express = require('express');
    var app = express();

    //启动机器人,你在微信公众平台填写的token
    var webot = require('weixin-robot');
    webot.monitor('keyboardcat123', '/', app)

    //载入路由规则
    webot.set('hi','你好');

    //微信后台只允许 80 端口，你可能需要自己做一层 proxy
    app.enable('trust proxy');
    app.listen(3000, '127.0.0.1', function() {
      console.log("WeBot Start... God bless love...");
    });

## 文档 && 示例

- 简单的在底部
- 更建议看extjs格式的文档: [http://webot.cloudfoundry.com/doc/index.html#!/api/WeBot](http://webot.cloudfoundry.com/doc/index.html#!/api/WeBot)
- 使用方式可以参照示例:

  - [examples/app.js](https://github.com/ktmud/weixin-robot/blob/master/examples/app.js)
  - [examples/rules.js](https://github.com/ktmud/weixin-robot/blob/master/examples/rules.js) 。

**代码和示例里面的注释已经详细的不能再详细了!!!**


如果一切顺利，你也搭建好了自己的机器人，欢迎到[此项目的 Wiki 页面](https://github.com/ktmud/weixin-robot/wiki/%E4%BD%BF%E7%94%A8%E6%AD%A4%E7%B3%BB%E7%BB%9F%E7%9A%84%E5%BE%AE%E4%BF%A1%E5%B8%90%E5%8F%B7)添加你的帐号。

## 贡献代码

欢迎直接 fork 并提交 pull request ，提交前请确保 make test 能通过。

如果要新加方法，请在注释内完善参数信息及用法。

## WeBot (机器人)
### set(设置路由)
  格式为:

  - function(pattern, handler, replies)
  - function(action)

### wait(设置下次回复) = function(uid, action)

### rewait(重试下次回复) = function(uid)

### dialog(简单的载入规则) = function(path)
载入yaml格式的文件,并注册为规则

文件格式:

      ---
      # 直接回复
      hi: 'hi,I am robot'
      
      # 匹配组替换
      /key (.*)/i: 
        - '你输入的匹配关键词是:{1}'
        - '我知道了,你输入了:{1}'
      
      # 随机回复一个
      hello: 
        - 你好
        - fine
        - how are you
      
      # 可以是一个action配置,如果没有pattern,自动使用key
      yaml:
        name: 'test_yaml_object'
        handler: '这是一个yaml的object配置'
      

## Action (动作规则)
### pattern: 匹配规则,支持正则式和函数
 
 支持的格式:
 
 - {String}   直接返回字符串
 - {RegExp}   仅匹配文本消息,正则式,把匹配组赋值给info.query
 - {Function} 签名为fn(info):boolean
 - {NULL}     为空则视为通过匹配


        //正则匹配后的匹配组存在info.query中
        webot.set({
          name: 'your_name',
          description: '自我介绍下吧, 发送: I am [enter_your_name]',
          pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
          // handler: function(info, action){
          //   return '你好,' + info.query[1]
          // }
          
          //或者更简单一点
          handler: '你好,{1}'
        })
      
        //pattern支持函数
        webot.set({
          name: 'pattern_fn',
          description: 'pattern支持函数,发送: fn',
          pattern: function(info){
            return info.isText() && info.text=='fn'
          },
          handler: 'pattern支持函数'
        })

### handler: 消息的处理逻辑
当返回非真值(null/false)时继续执行下一个动作, 否则回复给用户.

支持的格式:

- {String}    直接返回字符串
- {Array}     直接返回数组中的随机子元素
- {Function}  签名为fn(info, action):String 直接执行函数并返回
- {Function}  签名为fn(info, action, callback(err, reply)) 通过回调函数返回
- {Object}    key为pattern,value为handler, 根据匹配的正则去执行对应的handler (注意: 因为是Object,所以执行顺序不一定从上到下)

        webot.set({
          name: 'your_name',
          description: '自我介绍下吧, 发送: I am [enter_your_name]',
          pattern: /^(?:my name is|i am|我(?:的名字)?(?:是|叫)?)\s*(.*)$/i,
          // handler: function(info, action){
          //   return '你好,' + info.query[1]
          // }
          
          //或者更简单一点
          handler: '你好,{1}'
        })


### replies 下次回复

就是一组action,用于临时指定下次回复的内容.

      //等待下一次回复
      webot.set({
        name: 'ask_sex',
        description: '发送: sex? ,然后再回复girl或boy或both或其他',
        pattern: /^sex\??$/i,
        handler: '你猜猜看',
        //下次回复动作,replies,可以是任何能转换为action数组的对象,如Object,Array,String,Function等
        //object格式,key为pattern,value为handler, 注意object是没有顺序的
        replies: {
          //正则作为key的时候,注意要转义
          '/^g(irl)?\\??$/i': '猜错',
          'boy': function(info, action, next){
            return next(null, '猜对了')
          },
          'both': '对你无语...'
        }
        
        //也可以是直接的函数,同action: function(info, action, [cb]) 
        // replies: function(info, action){
        //   return 'haha, I wont tell you'
        // }

        //也可以是数组格式,每个元素为一个action
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


## Info (微信消息)

负责解析微信发来的消息,以及打包回复消息.

###原始消息属性

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

###回复消息属性

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
     *   - {String} pic 图片链接,支持JPG、PNG格式,较好的效果为大图(640x320),小图(80x80),限制图片链接的域名需要与开发者填写的基本资料中的Url一致
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

### toXML
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


Have fun with weixin, enjoy being a robot!

## LICENSE

(the DON'T CARE WHAT YOU DO WITH IT license)
