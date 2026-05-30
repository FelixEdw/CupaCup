const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches user info to req.user
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, email, role_id }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Sesi telah berakhir. Silakan login kembali.' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }
};

/**
 * RBAC Middleware Factory
 * Usage: authorize('admin') or authorize('moderator', 'admin')
 * role_id: 1=user, 2=moderator, 3=admin
 */
const ROLE_MAP = { user: 1, moderator: 2, admin: 3 };

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
    }

    const allowedIds = roles.map(r => ROLE_MAP[r]).filter(Boolean);
    if (!allowedIds.includes(req.user.role_id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Hak akses tidak cukup.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
