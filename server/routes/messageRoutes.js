const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  reactToMessage,
  deleteMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', upload.single('file'), sendMessage);
router.get('/:chatId', getMessages);
router.put('/:id/react', reactToMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
