const multer = require('multer');
const path = require('path');

// Multer Memory Storage engine for Cloudinary uploads
const storage = multer.memoryStorage();

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|ogg|pdf|doc|docx|txt/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType =
    allowedExtensions.test(file.mimetype) ||
    file.mimetype.includes('image') ||
    file.mimetype.includes('audio') ||
    file.mimetype.includes('video') ||
    file.mimetype.includes('application');

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
