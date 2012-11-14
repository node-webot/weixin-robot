# 豆瓣同城微信帐号自动回复系统

添加微信帐号 douban-event ，试试效果

使用 nodejs 构建，欢迎 fork

支持用正则做一些自动回复，大家可以编辑 `data/responses.js`

## TODO:

1. 用 memcache 存储用户上一次指定的城市
2. 时间和城区支持
3. 错误指令的提示
4. 更完备的 log
5. 完善 test case
6. 更新同城 nearby API ，既然已知 latlng ，`loc` 就应该是非必要参数

