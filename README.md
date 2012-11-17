# 微信公共帐号机器人

微信公共帐号自动回复系统，基于 NodeJS 实现

## 功能：

1. 支持用正则做一些自动回复，详见 `rules/dialogs/`
2. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”
3. 清晰独立的 router ，轻松实现文本匹配流程控制

添加微信帐号 douban-event ，试试效果

![豆瓣同城微信帐号二维码：douban-event](http://mp.weixin.qq.com/cgi-bin/getqrcode?fakeid=2394057060&style=1&action=download)

## TODO:

1. 豆瓣同城相关代码解耦
2. 设计基本的用户默认选项指令
3. clean up some dirty code and hard code
