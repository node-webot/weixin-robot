# 微信公共帐号机器人

微信公共帐号自动回复系统，基于 NodeJS 实现

## 功能：

1. 支持用正则做一些自动回复，详见 `rules/dialogs`
2. 支持等待后续操作模式，如可以提示用户“需要我执行xxx操作吗？”
3. 清晰独立的 router ，轻松实现文本匹配流程控制
4. 支持用 memcached 存储用户配置信息

添加微信帐号 douban-event ，试试效果

![豆瓣同城微信帐号二维码：douban-event](http://mp.weixin.qq.com/cgi-bin/getqrcode?fakeid=2394057060&style=1&action=download)

## 使用方法：

1. 新建你自己的配置文件，命名为 `{NODE_ENV}.js` ，放在 `conf` 里
2. 新建你自己的操作规则，放在 `rules` 里，分别有一个`Router` 和 `Waiter` ，对应文本路由和等待操作模式
3. 扩展你自己的对话回复库，放在 `rules/dialogs` 里

## TODO:

1. 豆瓣同城相关代码解耦
2. 设计基本的用户默认选项指令
3. clean up some dirty code and hard code

Have fun with weixin, enjoy being a robot!
