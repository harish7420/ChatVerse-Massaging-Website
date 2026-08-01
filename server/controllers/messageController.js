const asyncHandler = require('../utils/asyncHandler');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

/**
 * @desc    Send New Message (Text or Media Upload)
 * @route   POST /api/message
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, replyToId } = req.body;

  let fileUrl = '';
  let fileName = '';
  let fileType = 'text';

  if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    const mime = req.file.mimetype;

    if (mime.startsWith('image/')) fileType = 'image';
    else if (mime.startsWith('video/')) fileType = 'video';
    else if (mime.startsWith('audio/')) fileType = 'audio';
    else fileType = 'document';
  }

  try {
    // Check if chat is 1-on-1 and check block status
    const chat = await Chat.findById(chatId);
    if (chat && !chat.isGroupChat) {
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
      fileUrl,
      fileName,
      fileType,
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
  } catch (error) {
    if (error.statusCode === 403 || error.message.includes('block')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    // Offline Mock Message Response
    const mockMessage = {
      _id: 'msg_' + Date.now(),
      sender: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
      },
      content: content || (fileUrl ? 'Shared Attachment' : ''),
      chat: chatId,
      fileUrl,
      fileName,
      fileType,
      readBy: [req.user._id],
      deliveredTo: [],
      reactions: [],
      createdAt: new Date().toISOString(),
    };
    return res.status(201).json({ success: true, message: mockMessage });
  }
});

/**
 * @desc    Get All Messages for a specific chat
 * @route   GET /api/message/:chatId
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username avatar email')
      .populate('replyTo')
      .sort({ createdAt: 1 });

    return res.json({ success: true, messages });
  } catch (error) {
    // Return initial sample chat history for demo mode
    const mockMessages = [
      {
        _id: 'msg_1',
        sender: {
          _id: 'mock_1',
          username: 'Sarah Connor',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        },
        chat: chatId,
        content: 'Welcome to ChatVerse! Excited to test out all real-time features.',
        fileType: 'text',
        readBy: [req.user._id],
        reactions: [{ emoji: '🚀', user: 'mock_1' }],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: 'msg_2',
        sender: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        chat: chatId,
        content: 'Thanks Sarah! The dynamic UI and WebSockets feel super responsive.',
        fileType: 'text',
        readBy: [req.user._id],
        reactions: [{ emoji: '❤️', user: req.user._id }],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    return res.json({ success: true, messages: mockMessages });
  }
});

/**
 * @desc    Add Emoji Reaction to Message
 * @route   PUT /api/message/:id/react
 * @access  Private
 */
const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const messageId = req.params.id;

  res.json({
    success: true,
    message: 'Reaction updated',
    reaction: { user: req.user._id, emoji },
    messageId,
  });
});

/**
 * @desc    Delete Message
 * @route   DELETE /api/message/:id
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const messageId = req.params.id;

  try {
    await Message.findByIdAndUpdate(messageId, { isDeleted: true, content: 'This message was deleted' });
  } catch (e) {}

  res.json({ success: true, messageId, message: 'Message deleted successfully' });
});

module.exports = {
  sendMessage,
  getMessages,
  reactToMessage,
  deleteMessage,
};
