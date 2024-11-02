const { execSync } = require('child_process');

console.log('Installing Electron...');

try {
  execSync('npm install electron@33.0.0 --save-dev', { stdio: 'inherit' });
  console.log('Electron installed successfully');

  // 验证安装
  const electronVersion = execSync('npx electron --version', { encoding: 'utf8' }).trim();
  console.log('Installed Electron version:', electronVersion);
} catch (error) {
  console.error('Error installing Electron:', error.message);
  console.log('Full error output:');
  console.log(error.stdout?.toString() || 'No stdout');
  console.log(error.stderr?.toString() || 'No stderr');
}