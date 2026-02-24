const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Also make sure you're serving the avatars directory
app.use('/uploads/avatars', express.static('uploads/avatars'));


// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/classroom-app')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.log('❌ MongoDB connection error:', err));

// Socket.io

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('join-classroom', (classId) => {
    socket.join(classId);
    console.log(`User joined classroom: ${classId}`);
  });

  socket.on('leave-classroom', (classId) => {
    socket.leave(classId);
    console.log(`User left classroom: ${classId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/files', require('./routes/files'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/search', require('./routes/search'));
app.use('/api/admin', require('./routes/admin'));

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: '🎓 Classroom API is running with MongoDB!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API available at: http://localhost:${PORT}/api`);
});