const path = require('path');
const fs = require('fs');

console.log('Diagnosing Electron installation...');

// 检查 node_modules 中的 Electron
const electronPath = path.join(__dirname, 'node_modules', 'electron');
if (fs.existsSync(electronPath)) {
  console.log('Electron folder found in node_modules');
  
  // 检查 Electron 可执行文件
  const executablePath = path.join(electronPath, 'dist', 'electron.exe');
  if (fs.existsSync(executablePath)) {
    console.log('Electron executable found');
  } else {
    console.log('Electron executable not found. Try reinstalling Electron.');
  }
} else {
  console.log('Electron folder not found in node_modules. Electron might not be installed.');
}

// 尝试加载 Electron
try {
  const electron = require('electron');
  console.log('Electron loaded successfully');
  console.log('Electron version:', electron.app.getVersion());
} catch (error) {
  console.error('Failed to load Electron:', error.message);
}

// 检查 package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Electron version in package.json:', packageJson.devDependencies.electron);
} else {
  console.log('package.json not found');
}