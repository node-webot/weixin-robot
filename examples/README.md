# 微信公共帐号机器人(Weixin Robot) 示例

## 本地运行

1. git clone https://github.com/ktmud/weixin-robot
2. cd ./weixin-robot/example
3. npm install -d
4. set DEBUG=weixin.*  (设置环境变量方可查看调试信息)
4. node app.js

## 消息调试

1. cd ./weixin-robot/bin
2. node webot 
  - node webot --help 查看支持的参数
  - node webot 发送文字
  - node webot -i 发送图片
  - node webot -l 发送地理位置

## 本地测试

1. npm install mocha -g
2. cd ./weixin-robot/example
3. mocha

## 部署到cloudfoundry

1. cd ./weixin-robot/example (仅需发布example目录,而不需要整个weixin-robot)
2. npm install -d  (很多错误就是因为没安装依赖模块)
3. 修改manifest.yml (可选)
4. vmc push
5. vmc logs 可以看执行日志