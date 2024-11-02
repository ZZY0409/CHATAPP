const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

// 日志功能
const log = {
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args)
};

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'moments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter
});

// MongoDB 配置
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    log.info('Attempting to connect to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/chat', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    log.info('MongoDB connected successfully');
  } catch (err) {
    log.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// 模型定义
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: String,
  bio: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stars: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  onlineTime: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  loginTime: { type: Date }
}, { 
  timestamps: true 
});

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'audio'], default: 'text' },
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

const MomentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    url: String,
    caption: String
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

// 添加索引以提高查询性能
MomentSchema.index({ user: 1, createdAt: -1 });
MomentSchema.index({ visibility: 1 });

// 模型
const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const Moment = mongoose.model('Moment', MomentSchema);

// Express 应用设置
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 工具函数
const sendSocketResponse = (socket, event, data) => {
  try {
    socket.emit(event, data);
  } catch (error) {
    log.error(`Error sending socket response for event ${event}:`, error);
  }
};

// 用户处理器
const userHandlers = {
  async register(req, res) {
    const { username, password, email, bio } = req.body;
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword, email, bio });
      await user.save();
      log.info('User registered successfully:', username);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      log.error('Registration error:', err);
      res.status(500).json({ message: 'User registration failed' });
    }
  },

  async login(req, res) {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username }).populate('friends', 'username');
      if (user && await bcrypt.compare(password, user.password)) {
        user.loginTime = new Date();
        await user.save();
        log.info('Login successful:', username);
        res.status(200).json({
          message: 'Login successful',
          user: {
            username: user.username,
            friends: [...new Set(user.friends.map(f => f.username))],
            points: user.points
          }
        });
      } else {
        log.warn('Login failed:', username);
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (err) {
      log.error('Login error:', err);
      res.status(500).json({ message: 'Login failed' });
    }
  },

  async getUserInfo(req, res) {
    try {
      const user = await User.findOne({ username: req.params.username });
      if (user) {
        res.status(200).json({
          username: user.username,
          email: user.email,
          bio: user.bio
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
      log.error('Error fetching user info:', err);
      res.status(500).json({ message: 'Failed to fetch user info' });
    }
  }
};

// 朋友圈处理器
const momentHandlers = {
  // 获取朋友圈列表
  async getMoments(req, res) {
    try {
      const { username, page = 1, limit = 10 } = req.query;
      const user = await User.findOne({ username });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const query = {
        $or: [
          { visibility: 'public' },
          { 
            visibility: 'friends',
            user: { $in: [...user.friends, user._id] }
          },
          {
            visibility: 'private',
            user: user._id
          }
        ]
      };

      const skip = (page - 1) * limit;

      const moments = await Moment.find(query)
        .populate('user', 'username')
        .populate('likes.user', 'username')
        .populate('comments.user', 'username')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit));

      const total = await Moment.countDocuments(query);

      res.json({
        moments,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / limit),
          hasMore: skip + moments.length < total
        }
      });
    } catch (error) {
      log.error('获取朋友圈失败:', error);
      res.status(500).json({ message: '获取朋友圈失败' });
    }
  },

  // 创建朋友圈
  async createMoment(req, res) {
    try {
      const { username, content, visibility = 'public' } = req.body;
      const user = await User.findOne({ username });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const moment = new Moment({
        user: user._id,
        content,
        visibility,
        images: req.files ? req.files.map(file => ({
          url: `/uploads/moments/${file.filename}`
        })) : []
      });

      await moment.save();
      
      const populatedMoment = await Moment.findById(moment._id)
        .populate('user', 'username')
        .populate('likes.user', 'username')
        .populate('comments.user', 'username');

      // 发送实时通知给好友
      if (visibility !== 'private') {
        const notifyUsers = visibility === 'public' 
          ? await User.find({}) 
          : await User.find({ _id: { $in: user.friends } });

        notifyUsers.forEach(notifyUser => {
          io.to(notifyUser.username).emit('new moment', populatedMoment);
        });
      }

      res.status(201).json(populatedMoment);
    } catch (error) {
      log.error('创建朋友圈失败:', error);
      res.status(500).json({ message: '创建朋友圈失败' });
    }
  },

  // 添加评论
  async addComment(req, res) {
    try {
      const { momentId } = req.params;
      const { username, content } = req.body;

      const [user, moment] = await Promise.all([
        User.findOne({ username }),
        Moment.findById(momentId)
      ]);

      if (!user || !moment) {
        return res.status(404).json({ message: 'User or moment not found' });
      }

      // 检查评论权限
      if (!canUserAccessMoment(user, moment)) {
        return res.status(403).json({ message: 'No permission to comment' });
      }

      moment.comments.push({
        user: user._id,
        content
      });

      await moment.save();

      const updatedMoment = await Moment.findById(momentId)
        .populate('user', 'username')
        .populate('likes.user', 'username')
        .populate('comments.user', 'username');

      // 发送实时通知
      io.to(moment.user.username).emit('new comment', {
        momentId,
        comment: updatedMoment.comments[updatedMoment.comments.length - 1]
      });

      res.status(201).json(updatedMoment);
    } catch (error) {
      log.error('添加评论失败:', error);
      res.status(500).json({ message: '添加评论失败' });
    }
  },

  // 点赞/取消点赞
  async toggleLike(req, res) {
    try {
      const { momentId } = req.params;
      const { username } = req.body;

      const [user, moment] = await Promise.all([
        User.findOne({ username }),
        Moment.findById(momentId)
      ]);

      if (!user || !moment) {
        return res.status(404).json({ message: 'User or moment not found' });
      }

      // 检查点赞权限
      if (!canUserAccessMoment(user, moment)) {
        return res.status(403).json({ message: 'No permission to like' });
      }

      const existingLike = moment.likes.find(
        like => like.user.toString() === user._id.toString()
      );

      if (existingLike) {
        moment.likes = moment.likes.filter(
          like => like.user.toString() !== user._id.toString()
        );
      } else {
        moment.likes.push({ user: user._id });
      }

      await moment.save();

      const updatedMoment = await Moment.findById(momentId)
        .populate('user', 'username')
        .populate('likes.user', 'username')
        .populate('comments.user', 'username');

      // 发送实时通知
      if (!existingLike) {
        io.to(moment.user.username).emit('new like', {
          momentId,
          user: { username: user.username }
        });
      }

      res.json(updatedMoment);
    } catch (error) {
      log.error('处理点赞失败:', error);
      res.status(500).json({ message: '处理点赞失败' });
    }
  },

  // 删除朋友圈
  async deleteMoment(req, res) {
    try {
      const { momentId } = req.params;
      const { username } = req.body;

      const [user, moment] = await Promise.all([
        User.findOne({ username }),
        Moment.findById(momentId)
      ]);

      if (!moment) {
        return res.status(404).json({ message: 'Moment not found' });
      }

      if (moment.user.toString() !== user._id.toString()) {
        return res.status(403).json({ message: 'No permission to delete' });
      }

     // 删除相关的图片文件
     if (moment.images && moment.images.length > 0) {
      moment.images.forEach(image => {
        const imagePath = path.join(__dirname, image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await Moment.findByIdAndDelete(momentId);

    // 通知相关用户动态已被删除
    io.emit('moment deleted', { momentId });

    res.json({ message: 'Moment deleted successfully' });
  } catch (error) {
    log.error('删除朋友圈失败:', error);
    res.status(500).json({ message: '删除朋友圈失败' });
  }
}
};

// 权限检查辅助函数
const canUserAccessMoment = (user, moment) => {
if (moment.visibility === 'public') return true;
if (moment.user.toString() === user._id.toString()) return true;
if (moment.visibility === 'friends') {
  return user.friends.some(friendId => 
    friendId.toString() === moment.user.toString()
  );
}
return false;
};

// Socket.IO 事件处理
const socketHandlers = {
async handleLogin(socket, { username }) {
  try {
    const user = await User.findOne({ username })
      .populate('friends friendRequests', 'username');
    
    if (user) {
      socket.user = username;
      socket.join(username);
      
      log.info(`User ${username} logged in and joined room ${username}`);
      
      const uniqueFriends = [...new Set(user.friends.map(f => f.username))];
      const uniqueRequests = [...new Set(user.friendRequests.map(fr => fr.username))];
      
      io.emit('user connected', username);
      socket.emit('update points', { username, points: user.points });
      socket.emit('update friends', { username, friends: uniqueFriends });
      socket.emit('update friend requests', { username, friendRequests: uniqueRequests });

      // 获取最新朋友圈动态
      const latestMoments = await Moment.find({
        $or: [
          { visibility: 'public' },
          { 
            visibility: 'friends',
            user: { $in: [...user.friends, user._id] }
          },
          {
            visibility: 'private',
            user: user._id
          }
        ]
      })
      .populate('user', 'username')
      .populate('likes.user', 'username')
      .populate('comments.user', 'username')
      .sort('-createdAt')
      .limit(10);

      socket.emit('initial moments', latestMoments);
    }
  } catch (error) {
    log.error('Error handling login:', error);
  }
},

async handleFriendRequest(socket, data) {
  try {
    const { from, to } = data;
    const [fromUser, toUser] = await Promise.all([
      User.findOne({ username: from }),
      User.findOne({ username: to })
    ]);

    if (!fromUser || !toUser) {
      return sendSocketResponse(socket, 'friend request error', 'User not found');
    }

    if (fromUser.friends.includes(toUser._id)) {
      return sendSocketResponse(socket, 'friend request error', 'Already friends');
    }

    if (toUser.friendRequests.some(id => id.equals(fromUser._id))) {
      return sendSocketResponse(socket, 'friend request error', 'Friend request already sent');
    }

    toUser.friendRequests.push(fromUser._id);
    await toUser.save();

    io.to(to).emit('friend request', { from, to });
    sendSocketResponse(socket, 'friend request sent', 'Friend request sent successfully');
  } catch (error) {
    log.error('Error handling friend request:', error);
    sendSocketResponse(socket, 'friend request error', 'Failed to send friend request');
  }
},

async handleChatMessage(socket, msg) {
  try {
    const fromUser = await User.findOne({ username: msg.from });
    if (fromUser) {
      const savedMessage = new Message({
        from: fromUser._id,
        message: msg.message,
        type: msg.type || 'text'
      });
      
      await savedMessage.save();
      fromUser.messagesSent += 1;
      fromUser.points += 1;
      await fromUser.save();
      
      socket.emit('update points', { 
        username: msg.from, 
        points: fromUser.points 
      });
      io.emit('chat message', msg);
    }
  } catch (error) {
    log.error('Error handling chat message:', error);
  }
}
};

// 注册路由
app.post('/register', userHandlers.register);
app.post('/login', userHandlers.login);
app.get('/user/:username', userHandlers.getUserInfo);

// 朋友圈路由
app.get('/moments', momentHandlers.getMoments);
app.post('/moments', upload.array('images', 9), momentHandlers.createMoment);
app.post('/moments/:momentId/comments', momentHandlers.addComment);
app.post('/moments/:momentId/like', momentHandlers.toggleLike);
app.delete('/moments/:momentId', momentHandlers.deleteMoment);

// Socket.IO 连接处理
io.on('connection', (socket) => {
log.info('New client connected');

socket.on('login', (data) => socketHandlers.handleLogin(socket, data));
socket.on('send friend request', (data) => socketHandlers.handleFriendRequest(socket, data));
socket.on('chat message', (data) => socketHandlers.handleChatMessage(socket, data));

// 朋友圈相关事件
socket.on('new moment', (data) => {
  socket.broadcast.emit('moment added', data);
});

socket.on('like moment', async (data) => {
  try {
    const { username, momentId } = data;
    const moment = await Moment.findById(momentId);
    if (moment) {
      socket.to(moment.user.username).emit('moment liked', { username, momentId });
    }
  } catch (error) {
    log.error('Error handling moment like:', error);
  }
});

socket.on('disconnect', async () => {
  if (socket.user) {
    try {
      const user = await User.findOne({ username: socket.user });
      if (user) {
        const onlineDuration = (new Date() - new Date(user.loginTime)) / 1000;
        user.onlineTime += onlineDuration;
        user.points += Math.floor(onlineDuration / 60);
        await user.save();
      }
      io.emit('user disconnected', socket.user);
    } catch (error) {
      log.error('Error handling disconnect:', error);
    }
  }
});
});

// 错误处理中间件
app.use((err, req, res, next) => {
log.error('Unhandled error:', err);
res.status(500).json({ 
  message: 'Something went wrong!', 
  error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
});
});

// 优雅关闭
const gracefulShutdown = async () => {
try {
  await mongoose.connection.close();
  server.close(() => {
    log.info('Server closed gracefully');
    process.exit(0);
  });
} catch (error) {
  log.error('Error during shutdown:', error);
  process.exit(1);
}
};

// 启动服务器
const PORT = process.env.PORT || 3002;
connectDB().then(() => {
server.listen(PORT, () => {
  log.info(`Server is running on port ${PORT}`);
});
});

// 进程事件处理
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (reason, promise) => {
log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
log.error('Uncaught Exception:', error);
gracefulShutdown();
});

module.exports = app;