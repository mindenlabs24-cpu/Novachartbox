const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/novachart')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/upload', require('./routes/upload'));

// Track online users: { socketId -> userId }
const onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('user_online', (userId) => {
    onlineUsers[socket.id] = userId;
    io.emit('online_users', Object.values(onlineUsers));
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send_message', (message) => {
    io.to(message.roomId).emit('receive_message', message);
  });

  socket.on('typing', ({ roomId, userId, username }) => {
    socket.to(roomId).emit('typing', { userId, username });
  });

  socket.on('stop_typing', ({ roomId, userId }) => {
    socket.to(roomId).emit('stop_typing', { userId });
  });

  // WebRTC Signaling
  socket.on('call_user', ({ userToCall, signalData, from, name, callType }) => {
    io.to(userToCall).emit('incoming_call', { signal: signalData, from, name, callType });
  });

  socket.on('answer_call', ({ to, signal }) => {
    io.to(to).emit('call_accepted', signal);
  });

  socket.on('end_call', ({ to }) => {
    io.to(to).emit('call_ended');
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('online_users', Object.values(onlineUsers));
    console.log(`🔴 Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
