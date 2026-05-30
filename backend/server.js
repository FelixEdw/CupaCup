const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
require('dotenv').config();

// DB connection (validates on startup)
require('./src/config/db');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.12.217.202:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

// Register Socket.IO namespaces
const registerChatSocket = require('./src/socket/chatSocket');
registerChatSocket(io);

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Passport Initialization
const passport = require('./src/config/passport');
app.use(passport.initialize());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./src/routes/authRoutes'));
app.use('/api/users',         require('./src/routes/userRoutes'));
app.use('/api/posts',         require('./src/routes/postRoutes'));
app.use('/api/conversations', require('./src/routes/chatRoutes'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'MatchUp Core API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🚀 MatchUp SuperApp — Core API v1.0' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 MatchUp Core API running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready on ws://localhost:${PORT}/chat`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});