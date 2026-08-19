// build-script.js
const moment = require('moment');
const packageJson = require('./package.json');

const appName = packageJson.name;
const date = moment().format('YYYYMMDD');
const location = 'hangzhou';

// 4. 组合最终的外层文件夹名
const outputDirName = `${appName}_${date}_${location}`;

// 5. 【关键修改】直接定义一个独立的环境变量 OUTPUT_DIR
process.env.OUTPUT_DIR = outputDirName;

console.log(`📁 打包输出文件夹将重命名为: ${outputDirName}`);