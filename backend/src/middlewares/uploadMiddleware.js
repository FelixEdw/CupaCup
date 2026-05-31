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

// ── File type filter ──────────────────────────────────────────────────────────
// Allowed image types
const IMAGE_MIME = /^image\/(jpeg|jpg|png|gif|webp)$/i;
const IMAGE_EXT  = /\.(jpeg|jpg|png|gif|webp)$/i;

// Allowed video types
const VIDEO_MIME = /^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska|mpeg)$/i;
const VIDEO_EXT  = /\.(mp4|webm|ogg|mov|avi|mkv|mpeg|mpg)$/i;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isImage = IMAGE_MIME.test(file.mimetype) || IMAGE_EXT.test(ext);
  const isVideo = VIDEO_MIME.test(file.mimetype) || VIDEO_EXT.test(ext);

  if (isImage || isVideo) return cb(null, true);

  cb(new Error(
    `Tipe file tidak didukung: ${file.mimetype}. ` +
    'Gunakan JPEG, PNG, GIF, WebP, MP4, WebM, MOV, atau AVI.'
  ));
};

// ── Size limits ───────────────────────────────────────────────────────────────
const IMAGE_MAX_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB) || 5;
const VIDEO_MAX_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB) || 50; // video butuh lebih besar

// Multer instance with higher limit (video can be up to 50 MB)
const MAX_MB = Math.max(IMAGE_MAX_MB, VIDEO_MAX_MB);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// Exported presets
module.exports = {
  postImages:  upload.array('images', 4),   // up to 4 images OR 1 video for posts
  singleImage: upload.single('image'),       // avatar or chat image
};
