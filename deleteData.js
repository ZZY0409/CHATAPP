const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/chat', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => {
  console.log('MongoDB connected...');
  clearDatabase();
}).catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stars: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  onlineTime: { type: Number, default: 0 } // in seconds
});

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for group chat
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

async function clearDatabase() {
  try {
    await User.deleteMany({});
    await Message.deleteMany({});
    console.log('All users and messages have been deleted');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error deleting data:', err);
  }
}
