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

// 设置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

mongoose.connect('mongodb://localhost:27017/chat', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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
});

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'audio'], default: 'text' },
  timestamp: { type: Date, default: Date.now }
});

const MomentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  image: String,
  visibility: { type: String, enum: ['public', 'friends'], default: 'public' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const Moment = mongoose.model('Moment', MomentSchema);

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', async (req, res) => {
  console.log('Received register request:', req.body);
  const { username, password, email, bio } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, email, bio });
    await user.save();
    console.log('User registered successfully:', username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'User registration failed' });
  }
});

app.post('/login', async (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }).populate('friends', 'username');
    if (user && await bcrypt.compare(password, user.password)) {
      user.loginTime = new Date();
      await user.save();
      console.log('Login successful:', username);
      res.status(200).json({ 
        message: 'Login successful',
        user: {
          username: user.username,
          friends: user.friends.map(f => f.username),
          points: user.points
        }
      });
    } else {
      console.log('Login failed:', username);
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/user/:username', async (req, res) => {
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
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});

app.get('/friends/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('friends', 'username');
    if (user) {
      const friends = user.friends.map(friend => friend.username);
      res.status(200).json(friends);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch friends' });
  }
});

app.get('/friend-requests/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('friendRequests', 'username');
    if (user) {
      const friendRequests = user.friendRequests.map(friend => friend.username);
      res.status(200).json(friendRequests);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch friend requests' });
  }
});

app.post('/send-friend-request', async (req, res) => {
  const { from, to } = req.body;
  console.log(`Server: Received friend request from ${from} to ${to}`);
  try {
    const fromUser = await User.findOne({ username: from });
    const toUser = await User.findOne({ username: to });

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fromUser.friends.includes(toUser._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    if (toUser.friendRequests.some(id => id.equals(fromUser._id))) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    toUser.friendRequests.push(fromUser._id);
    await toUser.save();

    io.to(to).emit('friend request', { from, to });
    res.status(200).json({ message: 'Friend request sent successfully' });
  } catch (err) {
    console.error('Server: Error sending friend request:', err);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
});

app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.json({ filename: req.file.filename });
});

app.post('/moments', upload.single('image'), async (req, res) => {
  try {
    const { content, visibility, username } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const moment = new Moment({
      user: user._id,
      content,
      visibility,
      image: req.file ? `/uploads/${req.file.filename}` : null
    });
    await moment.save();
    res.status(201).json({ message: 'Moment created successfully', moment });
  } catch (error) {
    console.error('Error creating moment:', error);
    res.status(500).json({ message: 'Failed to create moment' });
  }
});

app.get('/moments', async (req, res) => {
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const moments = await Moment.find({
      $or: [
        { visibility: 'public' },
        { visibility: 'friends', user: { $in: [...user.friends, user._id] } }
      ]
    }).populate('user', 'username').sort('-createdAt');
    res.json(moments);
  } catch (error) {
    console.error('Error fetching moments:', error);
    res.status(500).json({ message: 'Failed to fetch moments' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('login', async ({ username }) => {
    console.log(`User ${username} logged in`);
    const user = await User.findOne({ username }).populate('friends friendRequests', 'username');
    if (user) {
      socket.user = username;
      socket.join(username);
      console.log(`User ${username} joined room ${username}`);
      io.emit('user connected', username);
      socket.emit('update points', { username, points: user.points });
      socket.emit('update friends', { username, friends: user.friends.map(f => f.username) });
      socket.emit('update friend requests', { username, friendRequests: user.friendRequests.map(fr => fr.username) });
    }
  });

  socket.on('get friends', async ({ username }) => {
    try {
      const user = await User.findOne({ username }).populate('friends', 'username');
      if (user) {
        const friends = user.friends.map(friend => friend.username);
        socket.emit('update friends', { username, friends });
      }
    } catch (err) {
      console.error('Error getting friends:', err);
    }
  });
  
  socket.on('get friend requests', async ({ username }) => {
    try {
      const user = await User.findOne({ username }).populate('friendRequests', 'username');
      if (user) {
        const friendRequests = user.friendRequests.map(friend => friend.username);
        socket.emit('update friend requests', { username, friendRequests });
      }
    } catch (err) {
      console.error('Error getting friend requests:', err);
    }
  });

  socket.on('chat message', async (msg) => {
    console.log('Received chat message:', msg);
    
    try {
      const fromUser = await User.findOne({ username: msg.from });
      if (fromUser) {
        let savedMessage;
        if (msg.type === 'audio') {
          // 处理音频消息
          const audioFileName = `audio_${Date.now()}.wav`;
          const audioPath = path.join(__dirname, 'uploads', audioFileName);
          
          // 从 Blob URL 获取音频数据并保存
          const response = await fetch(msg.message);
          const arrayBuffer = await response.arrayBuffer();
          fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));
          
          // 更新消息对象，使用相对路径
          msg.message = `/uploads/${audioFileName}`;
          
          savedMessage = new Message({
            from: fromUser._id,
            message: msg.message,
            type: 'audio'
          });
        } else {
          savedMessage = new Message({
            from: fromUser._id,
            message: msg.message,
            type: 'text'
          });
        }
        
        await savedMessage.save();

        fromUser.messagesSent += 1;
        fromUser.points += 1;
        await fromUser.save();
        
        socket.emit('update points', { username: msg.from, points: fromUser.points });
      }
      
      io.emit('chat message', msg);
    } catch (err) {
      console.error('Error processing chat message:', err);
    }
  });

  socket.on('private message', async (msg) => {
    console.log('Received private message:', msg);
    
    try {
      const fromUser = await User.findOne({ username: msg.from });
      const toUser = await User.findOne({ username: msg.to });
      if (fromUser && toUser) {
        let savedMessage;
        if (msg.type === 'audio') {
          // 处理音频消息
          const audioFileName = `audio_${Date.now()}.wav`;
          const audioPath = path.join(__dirname, 'uploads', audioFileName);
          
          // 从 Blob URL 获取音频数据并保存
          const response = await fetch(msg.message);
          const arrayBuffer = await response.arrayBuffer();
          fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));
          
          // 更新消息对象，使用相对路径
          msg.message = `/uploads/${audioFileName}`;
          
          savedMessage = new Message({
            from: fromUser._id,
            to: toUser._id,
            message: msg.message,
            type: 'audio'
          });
        } else {
          savedMessage = new Message({
            from: fromUser._id,
            to: toUser._id,
            message: msg.message,
            type: 'text'
          });
        }
        
        await savedMessage.save();

        socket.emit('private message', msg);
        socket.to(msg.to).emit('private message', msg);
      }
    } catch (err) {
      console.error('Error processing private message:', err);
    }
  });

  socket.on('add friend', async ({ username, friend }) => {
    try {
      const user = await User.findOne({ username });
      const friendUser = await User.findOne({ username: friend });

      if (user && friendUser && !user.friends.includes(friendUser._id)) {
        user.friends.push(friendUser._id);
        friendUser.friends.push(user._id);
        await user.save();
        await friendUser.save();

        socket.emit('friend added', friend);
        socket.to(friend).emit('friend added', username);
      }
    } catch (err) {
      console.error('Error adding friend:', err);
      socket.emit('error', 'Failed to add friend');
    }
  });

  socket.on('accept friend request', async ({ from, to }) => {
    try {
      const fromUser = await User.findOne({ username: from });
      const toUser = await User.findOne({ username: to });

      if (fromUser && toUser) {
        if (!fromUser.friends.includes(toUser._id) && !toUser.friends.includes(fromUser._id)) {
          fromUser.friends.push(toUser._id);
          toUser.friends.push(fromUser._id);
        }
        toUser.friendRequests = toUser.friendRequests.filter(id => !id.equals(fromUser._id));
        await fromUser.save();
        await toUser.save();
        
        const fromFriends = await User.find({ _id: { $in: fromUser.friends } }).select('username');
        const toFriends = await User.find({ _id: { $in: toUser.friends } }).select('username');
        
        socket.emit('update friends', { username: from, friends: fromFriends.map(f => f.username) });
        io.to(to).emit('update friends', { username: to, friends: toFriends.map(f => f.username) });
        io.to(to).emit('update friend requests', { username: to, friendRequests: toUser.friendRequests });
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      socket.emit('error', 'Failed to accept friend request');
    }
  });

  socket.on('load private chat', async ({ from, to }) => {
    try {
      const fromUser = await User.findOne({ username: from });
      const toUser = await User.findOne({ username: to });
      if (!fromUser || !toUser) {
        return socket.emit('error', 'User not found');
      }
      const messages = await Message.find({
        $or: [
          { from: fromUser._id, to: toUser._id },
          { from: toUser._id, to: fromUser._id }
        ]
      }).sort({ timestamp: 1 });
      
      const formattedMessages = messages.map(msg => ({
        from: msg.from.equals(fromUser._id) ? from : to,
        to: msg.to.equals(toUser._id) ? to : from,
        message: msg.message,
        type: msg.type,
        timestamp: msg.timestamp
      }));
      
      socket.emit('private chat history', formattedMessages);
    } catch (err) {
      console.error('Error loading private chat:', err);
      socket.emit('error', 'Failed to load private chat history');
    }
  });

  socket.on('send friend request', async (data) => {
    console.log('Server received friend request:', data);
    try {
      const { from, to } = data;
      const fromUser = await User.findOne({ username: from });
      const toUser = await User.findOne({ username: to });

      if (!fromUser || !toUser) {
        socket.emit('friend request error', 'User not found');
        return;
      }

      if (fromUser.friends.includes(toUser._id)) {
        socket.emit('friend request error', 'Already friends');
        return;
      }

      if (toUser.friendRequests.some(id => id.equals(fromUser._id))) {
        socket.emit('friend request error', 'Friend request already sent');
        return;
      }

      toUser.friendRequests.push(fromUser._id);
      await toUser.save();

      io.to(to).emit('friend request', { from, to });
      socket.emit('friend request sent', 'Friend request sent successfully');
    } catch (err) {
      console.error('Server: Error sending friend request:', err);
      socket.emit('friend request error', 'Failed to send friend request');
    }
  });

  socket.on('logout', async ({ username }) => {
    if (socket.user === username) {
      const user = await User.findOne({ username });
      if (user) {
        const onlineDuration = (new Date() - new Date(user.loginTime)) / 1000;
        user.onlineTime += onlineDuration;
        user.points += Math.floor(onlineDuration / 60);
        await user.save();
      }
      socket.leave(username);
      delete socket.user;
      io.emit('user disconnected', username);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected');
    if (socket.user) {
      const user = await User.findOne({ username: socket.user });
      if (user) {
        const onlineDuration = (new Date() - new Date(user.loginTime)) / 1000;
        user.onlineTime += onlineDuration;
        user.points += Math.floor(onlineDuration / 60);
        await user.save();
      }
      io.emit('user disconnected', socket.user);
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});