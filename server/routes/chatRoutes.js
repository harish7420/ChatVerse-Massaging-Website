const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  accessChat,
  fetchChats,
  toggleChatMeta,
  createGroupChat,
  updateGroupInfo,
  addToGroup,
  removeFromGroup,
  promoteGroupAdmin,
  demoteGroupAdmin,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename(req, file, cb) {
    cb(null, `group-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.use(protect);

router.post('/', accessChat);
router.get('/', fetchChats);
router.put('/:id/action', toggleChatMeta);

// Group Chat Routes
router.post('/group', createGroupChat);
router.put('/group/info', upload.single('groupIcon'), updateGroupInfo);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);
router.put('/group/promote', promoteGroupAdmin);
router.put('/group/demote', demoteGroupAdmin);

module.exports = router;
