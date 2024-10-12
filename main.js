const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const io = require('socket.io-client');
const betterSqlite3 = require('better-sqlite3');
const os = require('os');
const fetch = require('node-fetch');

let mainWindow;
let chatWindow;
let socket;

function connectSocket() {
  socket = io('http://localhost:3000');

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  const events = ['chat message', 'private message', 'friend added', 'update points', 
                  'update friends', 'user connected', 'user disconnected', 
                  'private chat history', 'friend request', 'update friend requests'];

  events.forEach(event => {
    socket.on(event, (data) => {
      console.log(`Received ${event} event:`, data);
      sendToAllWindows(event, data);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  chatWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:3001' 
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);
  chatWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
    chatWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  connectSocket();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('login', async (event, { username, password }) => {
  try {
    console.log('Login request:', { username, password });
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    console.log('Login response:', result);
    if (response.ok) {
      if (socket) socket.emit('login', { username });
      return { success: true, message: 'Login successful' };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred during login' };
  }
});

ipcMain.handle('register', async (event, { username, password, email, bio }) => {
  try {
    console.log('Register request:', { username, email, bio });
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, bio }),
    });
    const result = await response.json();
    console.log('Register response:', result);
    return { success: response.ok, message: result.message };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An error occurred during registration' };
  }
});

ipcMain.on('get friends', (event, data) => {
  if (socket) socket.emit('get friends', data);
});

ipcMain.on('get friend requests', (event, data) => {
  if (socket) socket.emit('get friend requests', data);
});

ipcMain.on('chat message', (event, data) => {
  if (socket) socket.emit('chat message', data);
});

ipcMain.on('private message', (event, data) => {
  if (socket) socket.emit('private message', data);
});

ipcMain.on('add friend', (event, data) => {
  if (socket) socket.emit('add friend', data);
});

ipcMain.on('accept friend request', (event, data) => {
  if (socket) socket.emit('accept friend request', data);
});

ipcMain.on('load private chat', (event, data) => {
  if (socket) socket.emit('load private chat', data);
});

ipcMain.on('logout', (event, data) => {
  if (socket) socket.emit('logout', data);
});

ipcMain.on('send friend request', (event, data) => {
  console.log('Main process: Sending friend request', data);
  if (socket) {
    socket.emit('send friend request', data);
  }
});

ipcMain.handle('get-chrome-history', async (event, limit = 100) => {
  const username = os.userInfo().username;
  const historyPath = path.join('C:', 'Users', username, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'History');
  
  try {
    const db = new betterSqlite3(historyPath, { readonly: true });
    const query = `SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT ?`;
    const rows = db.prepare(query).all(limit);
    db.close();

    return rows.map(row => ({
      url: row.url,
      title: row.title,
      lastVisit: new Date(row.last_visit_time / 1000).toISOString()
    }));
  } catch (error) {
    console.error('Error querying Chrome history:', error);
    throw error;
  }
});

ipcMain.handle('get user info', async (event, username) => {
  try {
    const response = await fetch(`http://localhost:3000/user/${username}`);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to fetch user info');
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
});

function sendToAllWindows(channel, ...args) {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    if (window.webContents) {
      window.webContents.send(channel, ...args);
    }
  });
}