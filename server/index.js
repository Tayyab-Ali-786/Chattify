// server.js
require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

// CORS Configuration - Allow both local and deployed frontend  
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Chattify server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

const mongoose = require('mongoose');
const rooms = new Map(); // roomId -> [socketIds]

io.on("connection", socket => {
  console.log("client connected:", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, []);
    rooms.get(roomId).push({ id: socket.id, name: userName });

    socket.to(roomId).emit("user-joined", { id: socket.id, name: userName });
  });

  socket.on("offer", ({ to, sdp, userName }) => {
    io.to(to).emit("offer", { from: socket.id, sdp, name: userName });
  });

  socket.on("answer", ({ to, sdp }) => {
    io.to(to).emit("answer", { from: socket.id, sdp });
  });

  socket.on("candidate", ({ to, candidate }) => {
    io.to(to).emit("candidate", { from: socket.id, candidate });
  });

  socket.on("chat-message", ({ to, message }) => {
    socket.to(to).emit("chat-message", { from: socket.id, message });
  });

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);
    rooms.forEach((users, roomId) => {
      rooms.set(roomId, users.filter(u => u.id !== socket.id));
      socket.to(roomId).emit("user-left", socket.id);
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});
