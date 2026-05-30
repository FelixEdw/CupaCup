const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Ensure upload directories exist
['posts', 'avatars', 'chat'].forEach(dir => {
  const fullPath = path.join(UPLOAD_PATH, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route-based directory selection
    let subfolder = 'posts';
    if (req.baseUrl.includes('users')) subfolder = 'avatars';
    if (req.baseUrl.includes('chat') || req.baseUrl.includes('conversations')) subfolder = 'chat';
    cb(null, path.join(UPLOAD_PATH, subfolder));
  },
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk  = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Hanya file gambar (jpeg, jpg, png, gif, webp) yang diizinkan.'));
};

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// Exported presets
module.exports = {
  postImages:  upload.array('images', 4),       // max 4 images for posts
  singleImage: upload.single('image'),           // avatar or chat image
};
