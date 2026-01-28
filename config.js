// const TARGET_URL = 'http://bw2.cb-ec.cn/teacher';
const PORT  = 8080;
// const HOST = '0.0.0.0'; // 监听所有网络接口（包括局域网）
const ip = '192.168.20.200'; //服务端ip
// const ip = '192.168.31.201'; //本地测试服务端ip1
// const ip = '192.168.31.xxx'; //本地测试服务端ip2
// 根据ip判断获取当前机器ID
const IpIdEnum = {
  '192.168.20.251': '01',
  '192.168.20.249': '02',
  '192.168.20.250': '03',
  '192.168.20.254': '04',
  '192.168.20.252': '05',
  '192.168.20.253': '06',
  // '192.168.31.xxx': 'ceshi007',
};

module.exports = { PORT, ip, IpIdEnum };

