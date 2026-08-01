const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createStatus, getStatuses, viewStatus, deleteStatus } = require('../controllers/statusController');
const { protect } = require('../middleware/authMiddleware');

// Configure Multer Storage for Status Attachments
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename(req, file, cb) {
    cb(null, `status-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max limit
});

router.use(protect);

router.post('/', upload.single('media'), createStatus);
router.get('/', getStatuses);
router.post('/:id/view', viewStatus);
router.delete('/:id', deleteStatus);

module.exports = router;
