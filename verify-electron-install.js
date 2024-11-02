const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Verifying Electron installation...');

try {
  // 检查 package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Electron version in package.json:', packageJson.devDependencies.electron);

  // 检查 node_modules
  const electronPath = path.join(__dirname, 'node_modules', 'electron');
  if (fs.existsSync(electronPath)) {
    console.log('Electron folder found in node_modules');
  } else {
    console.log('Warning: Electron folder not found in node_modules');
  }

  // 尝试运行 Electron
  const electronVersion = execSync('npx electron --version', { encoding: 'utf8' }).trim();
  console.log('Installed Electron version:', electronVersion);

  console.log('Electron installation verified successfully!');
} catch (error) {
  console.error('Error verifying Electron installation:', error.message);
}