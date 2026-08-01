const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage engine
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|ogg|pdf|doc|docx|txt/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedExtensions.test(file.mimetype) || file.mimetype.includes('audio') || file.mimetype.includes('video') || file.mimetype.includes('application');

  if (extName || mimeType) {
    return cb(null, true);
  }
  cb(new Error('Unsupported file format! Only images, videos, audio, PDF, and DOC files are allowed.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter,
});

module.exports = upload;
