weixin-robot 0.4
================

```
[*] 拆分为 `webot` 和 `wechat-mp` 模块
[*] `webot.watch` 不再支持直接将 `webot.watch(app, token)`，
    需要使用 `webot.watch(app, { token: token })`
[-] `webot.wait` 和 `webot.data` 方法已弃用，请总是使用 `info.wait`
[+] 增加 `info.session` 支持，替代 `webot.data`
[-] 去掉 `info.isLocation` 等判断消息类型的 API ，避免新增类型支持时需要穷举
[+] 增加 `info.is('location')` 替代 `info.isLocation()`
[-] 去掉 `info.query` ，使用 `info.param` 替代
[*] 特殊消息的参数值不再直接附在 `info` 上，必须通过 `info.param` 获取
[*] `info.pic` 属性被替换为了 `info.param.picUrl`
[-] 使用 `info.wait` 时不再支持闭包保存变量值，应总是使用 `info.session` 来存取变量
```
