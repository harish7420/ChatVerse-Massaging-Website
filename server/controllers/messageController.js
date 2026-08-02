const asyncHandler = require('../utils/asyncHandler');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

/**
 * @desc    Send New Message (Text or Base64 Media Payload)
 * @route   POST /api/message
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, replyToId, fileUrl, fileName, fileType } = req.body;

  if (!chatId) {
    res.status(400);
    throw new Error('Chat ID is required');
  }

  // Check if chat is 1-on-1 and check block status
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  if (!chat.isGroupChat) {
    const recipientId = chat.users.find((u) => u.toString() !== req.user._id.toString());
    if (recipientId) {
      const isBlocked = await BlockedUser.findOne({
        $or: [
          { blocker: req.user._id, blockedUser: recipientId },
          { blocker: recipientId, blockedUser: req.user._id },
        ],
      });
      if (isBlocked) {
        res.status(403);
        throw new Error('Message cannot be sent due to block restrictions');
      }
    }
  }

  let messageData = {
    sender: req.user._id,
    content: content || '',
    chat: chatId,
    fileUrl: fileUrl || '',
    fileName: fileName || '',
    fileType: fileType || (fileUrl ? 'image' : 'text'),
    replyTo: replyToId || null,
    readBy: [req.user._id],
  };

  let message = await Message.create(messageData);
  message = await message.populate('sender', 'username avatar email');
  message = await message.populate('chat');
  message = await User.populate(message, {
    path: 'chat.users',
    select: 'username avatar email',
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

  return res.status(201).json({ success: true, message });
});

/**
 * @desc    Get All Messages for a specific chat
 * @route   GET /api/message/:chatId
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'username avatar email')
    .populate('replyTo')
    .sort({ createdAt: 1 });

  return res.json({ success: true, messages });
});

/**
 * @desc    Add Emoji Reaction to Message
 * @route   PUT /api/message/:id/react
 * @access  Private
 */
const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const messageId = req.params.id;

  const message = await Message.findById(messageId);
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  // Remove existing reaction by current user if exists
  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );

  if (emoji) {
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();

  res.json({
    success: true,
    message: 'Reaction updated',
    reaction: { user: req.user._id, emoji },
    messageId,
  });
});

/**
 * @desc    Delete Message
 * @route   DELETE /api/messages/:id (also /api/message/:id)
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const messageId = req.params.id;

  const msg = await Message.findById(messageId);
  if (!msg) {
    res.status(404);
    throw new Error('Message not found');
  }

  const isSender = msg.sender.toString() === req.user._id.toString();
  const isAdmin = req.user.isAdmin === true;

  if (!isSender && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to delete this message');
  }

  const chatId = msg.chat;

  // Delete message from MongoDB Atlas
  await Message.findByIdAndDelete(messageId);

  // Update latestMessage in Chat if it was the deleted message
  const chat = await Chat.findById(chatId);
  if (chat && chat.latestMessage?.toString() === messageId) {
    const nextLatest = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 });
    chat.latestMessage = nextLatest ? nextLatest._id : null;
    await chat.save();
  }

  res.json({ success: true, messageId, chatId, message: 'Message deleted successfully' });
});

module.exports = {
  sendMessage,
  getMessages,
  reactToMessage,
  deleteMessage,
};

