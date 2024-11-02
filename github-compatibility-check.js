const https = require('https');
const semver = require('semver');

const electronVersion = '^33.0.0';
const nodeVersion = process.version;

console.log(`Checking compatibility for Electron ${electronVersion} and Node.js ${nodeVersion}`);

const options = {
  hostname: 'raw.githubusercontent.com',
  path: '/electron/electron/main/package.json',
  headers: { 'User-Agent': 'Node.js' }
};

https.get(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const electronPackage = JSON.parse(data);
      const requiredNodeVersion = electronPackage.engines.node;

      console.log(`Electron ${electronVersion} requires Node.js ${requiredNodeVersion}`);
      
      if (semver.satisfies(nodeVersion, requiredNodeVersion)) {
        console.log('Your Node.js version is compatible with this Electron version.');
      } else {
        console.log('Your Node.js version may not be compatible. Consider updating Node.js.');
      }
    } catch (error) {
      console.error('Error parsing Electron package.json:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching Electron package.json:', err.message);
});