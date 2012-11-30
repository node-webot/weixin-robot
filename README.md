# 微信公共帐号机器人(Weixin Robot)

[微信公众平台](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-index&lang=zh_CN)提供的[开放信息接口](http://mp.weixin.qq.com/cgi-bin/indexpage?t=wxm-callbackapi-doc&lang=zh_CN)的自动回复系统，基于`node.js` 实现。

## 功能：

1. 清晰独立的 router ，轻松实现文本匹配流程控制
2. 基于正则表达式的对话设定，配置简单，可以给一句话随机回复不同内容
3. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”

添加微信帐号 douban-event ，试试效果

![豆瓣同城微信帐号二维码：douban-event](http://i.imgur.com/ijE19.jpg)

## 使用方法：

可通过 npm 安装：

```
npm install weixin-robot
```
具体使用方法参见 `exapmles/app.js` 。

提供可执行文件 `webot` 用于发送测试消息。

Have fun with weixin, enjoy being a robot!

## LICENSE

(the DON'T CARE WHAT YOU DO WITH IT license)
