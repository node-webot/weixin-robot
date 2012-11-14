module.exports = {
  port: 3000,
  hostname: '127.0.0.1',
  douban: {
    apikey: '004bd0da70f50d1000e3728f52df2730'
  },
  mixpanel: 'keyboardcat',
  weixin: 'keyboarddog'
};
var environ = process.env.NODE_ENV || 'development';
try {
  var localConf = require('./' + environ);
  for (var i in localConf) {
    module.exports[i] = localConf[i];
  }
} catch (e) {}
