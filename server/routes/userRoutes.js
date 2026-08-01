const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getUsers,
  getUserById,
  updateUserProfile,
  getBlockedUsers,
  blockUser,
  unblockUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename(req, file, cb) {
    cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.use(protect);

router.get('/', getUsers);
router.get('/blocked', getBlockedUsers);
router.get('/:id', getUserById);
router.put('/update', upload.single('avatar'), updateUserProfile);
router.post('/block/:id', blockUser);
router.post('/unblock/:id', unblockUser);

module.exports = router;
