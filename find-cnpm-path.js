const { execSync } = require('child_process');
const path = require('path');

try {
  // 获取 npm 全局安装路径
  const npmGlobalPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
  
  // 构建 cnpm 可能的路径
  const cnpmPath = path.join(npmGlobalPath, '..', 'cnpm');
  
  console.log('Possible cnpm path:', cnpmPath);
  console.log('Try running:', `"${cnpmPath}" install electron@33.0.0 --save-dev`);
} catch (error) {
  console.error('Error finding cnpm path:', error.message);
}