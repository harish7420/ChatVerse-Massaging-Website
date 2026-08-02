const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
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
