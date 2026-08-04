const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  accessChat,
  fetchChats,
  deleteChat,
  clearChatMessages,
  toggleChatMeta,
  pinChat,
  muteChat,
  blockUserFromChat,
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
router.delete('/:id', deleteChat);
router.delete('/:id/messages', clearChatMessages);

// Meta Actions (Pin, Mute, Block)
router.put('/:id/action', toggleChatMeta);
router.patch('/pin', pinChat);
router.patch('/:id/pin', pinChat);
router.patch('/mute', muteChat);
router.patch('/:id/mute', muteChat);
router.patch('/block', blockUserFromChat);
router.patch('/:id/block', blockUserFromChat);

// Group Chat Routes
router.post('/group', createGroupChat);
router.put('/group/info', upload.single('groupIcon'), updateGroupInfo);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);
router.put('/group/promote', promoteGroupAdmin);
router.put('/group/demote', demoteGroupAdmin);

module.exports = router;
