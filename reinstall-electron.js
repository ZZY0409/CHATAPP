const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Reinstalling Electron...');

try {
  // 卸载当前的 Electron
  execSync('npm uninstall electron', { stdio: 'inherit' });
  console.log('Electron uninstalled successfully');

  // 清理 npm 缓存
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('npm cache cleaned');

  // 重新安装 Electron
  execSync('npm install electron@33.0.0 --save-dev', { stdio: 'inherit' });
  console.log('Electron reinstalled successfully');

  // 验证安装
  const electronPath = path.join(__dirname, 'node_modules', 'electron');
  if (fs.existsSync(electronPath)) {
    console.log('Electron folder found in node_modules');
    const installedVersion = execSync('npx electron --version', { encoding: 'utf8' }).trim();
    console.log('Installed Electron version:', installedVersion);
  } else {
    console.log('Electron folder not found. Installation may have failed.');
  }
} catch (error) {
  console.error('An error occurred during reinstallation:', error.message);
}