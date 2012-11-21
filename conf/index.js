module.exports = {
  port: 3000,
  hostname: '127.0.0.1',
  douban: {
    apikey: '004bd0da70f50d1000e3728f52df2730'
  },
  memcached: {
    hosts: '127.0.0.1:11211',
  },
  amap: 'fbc5912fdde546936f84e5935cb3110744fb390a',
  mixpanel: 'keyboardcat',
  routers: ['location', 'dialogs'],
  weixin: 'keyboarddog'
};
var environ = process.env.NODE_ENV || 'development';
try {
  var localConf = require('./' + environ);
  for (var i in localConf) {
    module.exports[i] = localConf[i];
  }
} catch (e) {}
