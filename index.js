// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://messanger-frontend-pi.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const users = {}; // socket.id -> username
const sockets = {}; // username -> socket.id

function getOnlineUsers() {
  return Object.values(users);
}

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('user-joined', (username) => {
    users[socket.id] = username;
    sockets[username] = socket.id;
    console.log(`${username} joined the chat.`);
    io.emit('update-user-list', getOnlineUsers());
  });

  socket.on('send-message', (data) => {
    const user = users[socket.id];
    if (user && data) {
      const timestamp = new Date().toISOString();
      io.emit('receive-message', {
        user,
        type: data.type,
        content: data.content,
        time: timestamp,
      });
    }
  });

  socket.on('typing', ({ to }) => {
    const user = users[socket.id];
    if (user) {
      if (to) {
        // Private typing
        const toSocket = sockets[to];
        if (toSocket) {
          io.to(toSocket).emit('user-typing', { user, from: user });
        }
      } else {
        // Public typing
        socket.broadcast.emit('user-typing', { user, from: null });
      }
    }
  });
  
  socket.on('stop-typing', ({ to }) => {
    const user = users[socket.id];
    if (user) {
      if (to) {
        const toSocket = sockets[to];
        if (toSocket) {
          io.to(toSocket).emit('user-stop-typing', { user, from: user });
        }
      } else {
        socket.broadcast.emit('user-stop-typing', { user, from: null });
      }
    }
  });
  

  socket.on('private-message', ({ to, message }) => {
    const from = users[socket.id];
    const time = new Date().toISOString();
    const toSocketId = sockets[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receive-private-message', {
        from,
        content: message,
        time
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`${user} disconnected`);
      delete sockets[user];
      delete users[socket.id];
      io.emit('update-user-list', getOnlineUsers());
    }
  });
});

server.listen(8000, () => {
  console.log('Server is running on http://localhost:8000');
});