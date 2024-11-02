const net = require('net');

const port = 3000;

const server = net.createServer()
  .once('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is currently in use. Please close the application using this port and try again.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  })
  .once('listening', () => {
    server.close();
    console.log(`Port ${port} is available.`);
    process.exit(0);
  })
  .listen(port);