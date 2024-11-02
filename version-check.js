const electron = require('electron');
const fs = require('fs');
const path = require('path');

console.log(`Node.js version: ${process.version}`);
console.log(`Electron version: ${process.versions.electron}`);

// 读取 package.json 文件
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
console.log(`Electron version in package.json: ${packageJson.devDependencies.electron}`);