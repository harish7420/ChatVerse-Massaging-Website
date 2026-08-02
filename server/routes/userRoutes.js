const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  getUsers,
  getUserById,
  updateUserProfile,
  getBlockedUsers,
  blockUser,
  unblockUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUsers);
router.get('/blocked', getBlockedUsers);
router.get('/:id', getUserById);
router.put('/update', upload.single('avatar'), updateUserProfile);
router.post('/block/:id', blockUser);
router.post('/unblock/:id', unblockUser);

module.exports = router;
