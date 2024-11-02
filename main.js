const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const io = require('socket.io-client');
const betterSqlite3 = require('better-sqlite3');
const os = require('os');
const fetch = require('node-fetch');
const log = require('electron-log');
const fs = require('fs');

// 日志配置
function setupLogging() {
  const userDataPath = app.getPath('userData');
  const logPath = path.join(userDataPath, 'logs');

  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }

  log.transports.file.level = 'debug';
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.file.file = path.join(logPath, 'main.log');

  log.transports.console.level = 'debug';
  log.transports.console.format = '[{level}] {text}';

  return log;
}

// 初始化日志
const logger = setupLogging();
logger.info('Application Starting...');

// 全局变量
let mainWindow = null;
let chatWindow = null;
let socket = null;

// 配置常量
const WINDOW_CONFIG = {
  main: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false
  },
  chat: {
    width: 400,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    show: false
  }
};

const API_URLS = {
  development: {
    api: 'http://localhost:3002',
    frontend: 'http://localhost:3001'
  },
  production: {
    api: process.env.REACT_APP_API_URL,
    frontend: `file://${path.join(__dirname, 'build', 'index.html')}`
  }
};

// 工具函数
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Socket.IO 连接管理
function setupSocket() {
  const apiUrl = isDev ? API_URLS.development.api : API_URLS.production.api;
  
  logger.info(`Connecting to Socket.IO server at ${apiUrl}`);
  
  socket = io(apiUrl, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    logger.info('Connected to Socket.IO server');
    mainWindow?.webContents?.send('server-connection-status', { connected: true });
  });

  socket.on('connect_error', (error) => {
    logger.error('Socket connection error:', error);
    mainWindow?.webContents?.send('server-connection-status', { 
      connected: false, 
      error: error.message 
    });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Disconnected from server:', reason);
  });

  const events = [
    'chat message', 'private message', 'friend added', 
    'update points', 'update friends', 'user connected', 
    'user disconnected', 'private chat history', 
    'friend request', 'update friend requests'
  ];

  events.forEach(event => {
    socket.on(event, (data) => {
      logger.info(`Received ${event} event:`, data);
      sendToAllWindows(event, data);
    });
  });

  return socket;
}

// 窗口创建函数
function createWindowWithConfig(config) {
  return new BrowserWindow({
    ...config,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
      sandbox: false,
      webSecurity: true,
      enableRemoteModule: false
    }
  });
}

async function loadWindow(window, isMainWindow = true) {
  const url = isDev ? API_URLS.development.frontend : API_URLS.production.frontend;
  
  try {
    await window.loadURL(url);
    logger.info(`Window loaded successfully: ${url}`);
    
    if (isMainWindow || isDev) {
      window.show();
      if (isDev) window.webContents.openDevTools();
    }
  } catch (error) {
    logger.error('Failed to load window:', error);
    throw error;
  }
}

// 创建主窗口
async function createMainWindow() {
  logger.info('Creating main window');
  
  mainWindow = createWindowWithConfig(WINDOW_CONFIG.main);
  
  mainWindow.on('closed', () => {
    logger.info('Main window closed');
    mainWindow = null;
  });

  try {
    await loadWindow(mainWindow);
  } catch (error) {
    logger.error('Failed to create main window:', error);
    app.quit();
  }

  return mainWindow;
}

// 创建聊天窗口
async function createChatWindow() {
  logger.info('Creating chat window');
  
  chatWindow = createWindowWithConfig(WINDOW_CONFIG.chat);
  
  chatWindow.on('closed', () => {
    logger.info('Chat window closed');
    chatWindow = null;
  });

  try {
    await loadWindow(chatWindow, false);
  } catch (error) {
    logger.error('Failed to create chat window:', error);
  }

  return chatWindow;
}

// API 请求处理
const apiHandler = {
  async getMoments(event, { username }) {
    try {
      const response = await fetch(
        apiHandler.getApiUrl(`/moments?username=${username}`),
        { method: 'GET' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Moments fetch error:', error);
      throw error;
    }
  },

  async createMoment(event, formData) {
    try {
      const response = await fetch(
        apiHandler.getApiUrl('/moments'),
        {
          method: 'POST',
          body: formData
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Create moment error:', error);
      throw error;
    }
  },
  async makeRequest(url, options) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      logger.error('API request failed:', error);
      throw error;
    }
  },

  getApiUrl(endpoint) {
    return isDev ? `${API_URLS.development.api}${endpoint}` : `${API_URLS.production.api}${endpoint}`;
  }
};

// IPC 事件处理
const ipcHandlers = {
  async login(event, { username, password }) {
    try {
      const { ok, data } = await apiHandler.makeRequest(
        apiHandler.getApiUrl('/login'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        }
      );

      if (ok) {
        socket?.emit('login', { username });
        return { success: true, message: 'Login successful', user: data.user };
      }
      return { success: false, message: data.message };
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, message: 'Connection error during login' };
    }
  },

  async register(event, userData) {
    try {
      const { ok, data } = await apiHandler.makeRequest(
        apiHandler.getApiUrl('/register'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        }
      );
      return { success: ok, message: data.message };
    } catch (error) {
      logger.error('Registration error:', error);
      return { success: false, message: 'Connection error during registration' };
    }
  },

  async getChromeHistory(event, limit = 100) {
    try {
      const username = os.userInfo().username;
      const historyPath = path.join('C:', 'Users', username, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'History');
      
      const db = new betterSqlite3(historyPath, { readonly: true });
      const rows = db.prepare('SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT ?').all(limit);
      db.close();

      return rows.map(row => ({
        url: row.url,
        title: row.title,
        lastVisit: new Date(row.last_visit_time / 1000).toISOString()
      }));
    } catch (error) {
      logger.error('Chrome history query error:', error);
      throw error;
    }
  },

  async getUserInfo(event, username) {
    try {
      const { ok, data } = await apiHandler.makeRequest(
        apiHandler.getApiUrl(`/user/${username}`),
        { method: 'GET' }
      );
      
      if (!ok) throw new Error('Failed to fetch user info');
      return data;
    } catch (error) {
      logger.error('User info fetch error:', error);
      throw error;
    }
  }
};

// Socket 事件转发
const socketEvents = [
  'get friends',
  'get friend requests',
  'chat message',
  'private message',
  'add friend',
  'accept friend request',
  'load private chat',
  'logout',
  'send friend request'
];

const debouncedEmit = debounce((event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
    logger.info(`Emitted ${event}:`, data);
  } else {
    logger.warn(`Failed to emit ${event}: Socket not connected`);
  }
}, 300);

socketEvents.forEach(event => {
  ipcMain.on(event, (_, data) => {
    if (['get friends', 'get friend requests'].includes(event)) {
      debouncedEmit(event, data);
    } else {
      if (socket?.connected) {
        socket.emit(event, data);
        logger.info(`Emitted ${event}:`, data);
      } else {
        logger.warn(`Failed to emit ${event}: Socket not connected`);
      }
    }
  });
});

// 注册 IPC 处理器
Object.entries(ipcHandlers).forEach(([channel, handler]) => {
  ipcMain.handle(channel, handler);
});

// 聊天窗口控制
ipcMain.on('show-chat-window', (event, data) => {
  chatWindow?.show();
  chatWindow?.webContents.send('load-chat', data);
});

ipcMain.on('hide-chat-window', () => {
  chatWindow?.hide();
});

// 应用程序初始化
async function initializeApp() {
  try {
    await createMainWindow();
    await createChatWindow();
    setupSocket();
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    app.quit();
  }
}

// 应用程序事件
app.on('ready', () => {
  logger.info('App is ready');
  initializeApp();
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  logger.info('App activated');
  if (!mainWindow) {
    initializeApp();
  }
});

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});