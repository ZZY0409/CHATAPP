const { execSync } = require('child_process');

console.log('Setting Electron mirror...');

try {
  // 为当前会话设置环境变量
  process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
  process.env.ELECTRON_CUSTOM_DIR = '{{ version }}';

  // 为 Windows 系统设置永久环境变量
  if (process.platform === 'win32') {
    execSync('setx ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/', { stdio: 'inherit' });
    execSync('setx ELECTRON_CUSTOM_DIR "{{ version }}"', { stdio: 'inherit' });
    console.log('Electron mirror set successfully for Windows.');
  } else {
    console.log('For non-Windows systems, add the following to your shell profile (.bashrc, .zshrc, etc.):');
    console.log('export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/');
    console.log('export ELECTRON_CUSTOM_DIR="{{ version }}"');
  }

  console.log('Current Electron mirror:', process.env.ELECTRON_MIRROR);
} catch (error) {
  console.error('Error setting Electron mirror:', error.message);
}