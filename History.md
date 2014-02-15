weixin-robot 0.5
==================

Breaking change!

- [*] 使用`wechat-mp` 模块来处理与微信之间的关系，各 middlewares 拆分细化
- [+] 新增 `webot.middleware()` 接口来调用 `webot.reply()` 


weixin-robot 0.4.6
==================

- [+] 语音识别消息增加 info.param.recognition 
- [*] 升级依赖


webot 0.4.1-1
===============

- 0.4.1 之后的更新请移步 [webot/History.md](https://github.com/node-webot/webot/blob/master/History.md)

webot 0.4.1
===============

- [+] 增加 `webot.waitRule` ，创建等待回复时专用的规则
- [+] 增加 `webot.use()` 方法，可以在回复每条消息前对请求消息预处理
- [+] 增加 `webot.config.beforeSend` ，回复消息的预处理，替代 mapping 的功能
- [-] 删掉打包消息时的 `mapping` 支持

weixin-robot 0.4
================

- [*] 规则匹配逻辑拆分为 `webot` ， 微信相关逻辑和 session 支持采用 `wechat` 模块
- [*] `webot.watch` 不再支持 `webot.watch(app, path, token)` 这种易混淆的 API，
  需要使用 `webot.watch(app, { path: path, token: token })`
- [*] 特殊消息的参数值不再直接附在 `info` 上，必须通过 `info.param` 获取
  值得注意的时，`info.pic` 属性被替换为了 `info.param.picUrl`
- [*] `webot.checkSig`, `webot.bodyParser` 等 middleware 不再支持直接调用。
  但可以通过 `webot.wechat` 访问到一些 `wechat` 组件的方法。
- [-] `webot.wait` 和 `webot.data` 方法已弃用，请总是使用 `info.wait`
- [*] `info.wait` 需要 session 支持，请使用 connect 的 cookieSession 中间件为请求附加 session
- [-] 去掉 `info.isLocation` 等判断消息类型的 API ，避免新增类型支持时需要穷举
- [+] 增加 `info.is('location')` 替代 `info.isLocation()`
- [-] 去掉 `info.query` ，使用 `info.param` 代替
- [-] 使用 `info.wait` 时不再支持闭包留存变量值，应总是使用 `info.session` 来存取变量
- [+] `info.wait` 只接受 rule name 字符串作为参数
