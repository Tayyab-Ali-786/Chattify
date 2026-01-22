// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

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
    io.to(to).emit("chat-message", { from: socket.id, message });
  });

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);
    rooms.forEach((users, roomId) => {
      rooms.set(roomId, users.filter(u => u.id !== socket.id));
      socket.to(roomId).emit("user-left", socket.id);
    });
  });
});

server.listen(3001, () => console.log("Signaling server running on :3001"));
