const asyncHandler = require('../utils/asyncHandler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const BlockedUser = require('../models/BlockedUser');

/**
 * Helper to generate deterministic conversationKey for 1-on-1 chats
 */
const generateConversationKey = (userId1, userId2) => {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

/**
 * @desc    Access or Create 1-on-1 Chat with deterministic conversationKey
 * @route   POST /api/chat or POST /api/conversation
 * @access  Private
 */
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('UserId parameter is required');
  }

  if (userId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot create a direct chat with yourself');
  }

  const conversationKey = generateConversationKey(req.user._id, userId);

  // Search by conversationKey first, or fallback to users array search
  let isChat = await Chat.find({
    $or: [
      { conversationKey: conversationKey },
      {
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      },
    ],
  })
    .populate('users', '-password')
    .populate('latestMessage');

  isChat = await User.populate(isChat, {
    path: 'latestMessage.sender',
    select: 'username avatar email',
  });

  if (isChat.length > 0) {
    const existingChat = isChat[0];
    if (!existingChat.conversationKey) {
      existingChat.conversationKey = conversationKey;
      await existingChat.save().catch(() => {});
    }
    return res.json({ success: true, chat: existingChat });
  } else {
    const chatData = {
      chatName: 'Direct Chat',
      isGroupChat: false,
      conversationKey,
      users: [req.user._id, userId],
    };

    let createdChat;
    try {
      createdChat = await Chat.create(chatData);
    } catch (err) {
      // Handles rare race condition where conversationKey was created concurrently
      createdChat = await Chat.findOne({ conversationKey });
    }

    const fullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
    return res.status(201).json({ success: true, chat: fullChat });
  }
});

/**
 * @desc    Fetch all chats for logged-in user (removes duplicate objects)
 * @route   GET /api/chat or GET /api/conversation
 * @access  Private
 */
const fetchChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage')
    .sort({ updatedAt: -1 });

  const populatedChats = await User.populate(chats, {
    path: 'latestMessage.sender',
    select: 'username avatar email',
  });

  // Deduplicate conversations array by _id
  const uniqueMap = new Map();
  populatedChats.forEach((c) => {
    if (c && c._id) uniqueMap.set(c._id.toString(), c);
  });

  return res.json({ success: true, chats: Array.from(uniqueMap.values()) });
});

/**
 * @desc    Delete Conversation & All Messages (WhatsApp Delete Chat)
 * @route   DELETE /api/chat/:id or DELETE /api/conversation/:id
 * @access  Private
 */
const deleteChat = asyncHandler(async (req, res) => {
  const chatId = req.params.id || req.body.chatId;

  if (!chatId) {
    return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, message: 'Conversation not found or already deleted' });
  }

  const isParticipant = chat.users.some((u) => u.toString() === req.user._id.toString());
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: 'Unauthorized user' });
  }

  // Delete all messages belonging to this conversation
  await Message.deleteMany({ chat: chatId });

  // Delete the conversation from MongoDB
  await Chat.findByIdAndDelete(chatId);

  return res.json({
    success: true,
    message: 'Conversation and all messages deleted successfully',
    chatId,
  });
});

/**
 * @desc    Clear All Messages in Conversation (WhatsApp Clear Chat)
 * @route   DELETE /api/chat/:id/messages or DELETE /api/conversation/:id/messages
 * @access  Private
 */
const clearChatMessages = asyncHandler(async (req, res) => {
  const chatId = req.params.id || req.body.chatId;

  if (!chatId) {
    return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isParticipant = chat.users.some((u) => u.toString() === req.user._id.toString());
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: 'Unauthorized user' });
  }

  // Delete all messages belonging to this conversation
  await Message.deleteMany({ chat: chatId });

  // Reset latestMessage pointer
  chat.latestMessage = null;
  await chat.save();

  return res.json({
    success: true,
    message: 'Chat messages cleared successfully',
    chatId,
  });
});

/**
 * @desc    Toggle Chat Pin/Archive/Mute
 * @route   PUT /api/chat/:id/action or PATCH /api/chat/pin | /api/chat/mute
 * @access  Private
 */
const toggleChatMeta = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'pin', 'archive', 'mute'
  const chatId = req.params.id || req.body.chatId;
  const userId = req.user._id;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }

  let field = '';
  if (action === 'pin') field = 'pinnedBy';
  else if (action === 'archive') field = 'archivedBy';
  else if (action === 'mute') field = 'mutedBy';

  if (field) {
    const exists = chat[field].some((id) => id.toString() === userId.toString());
    if (exists) {
      chat[field] = chat[field].filter((id) => id.toString() !== userId.toString());
    } else {
      chat[field].push(userId);
    }
    await chat.save();
  }

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({
    success: true,
    message: `Chat ${action} toggled successfully`,
    chat: updatedChat,
    action,
  });
});

/**
 * @desc    PATCH Pin Chat Endpoint
 * @route   PATCH /api/chat/pin or PATCH /api/conversation/pin
 * @access  Private
 */
const pinChat = asyncHandler(async (req, res) => {
  req.body.action = 'pin';
  return toggleChatMeta(req, res);
});

/**
 * @desc    PATCH Mute Chat Endpoint
 * @route   PATCH /api/chat/mute or PATCH /api/conversation/mute
 * @access  Private
 */
const muteChat = asyncHandler(async (req, res) => {
  req.body.action = 'mute';
  return toggleChatMeta(req, res);
});

/**
 * @desc    PATCH Block User from Chat
 * @route   PATCH /api/chat/block or PATCH /api/conversation/block
 * @access  Private
 */
const blockUserFromChat = asyncHandler(async (req, res) => {
  const chatId = req.params.id || req.body.chatId;
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }

  if (chat.isGroupChat) {
    return res.status(400).json({ success: false, message: 'Cannot block a group chat' });
  }

  const targetUserId = chat.users.find((u) => u.toString() !== req.user._id.toString());
  if (!targetUserId) {
    return res.status(400).json({ success: false, message: 'Recipient not found in chat' });
  }

  const existingBlock = await BlockedUser.findOne({
    blocker: req.user._id,
    blockedUser: targetUserId,
  });

  if (existingBlock) {
    await BlockedUser.findByIdAndDelete(existingBlock._id);
    return res.json({ success: true, message: 'User unblocked successfully', isBlocked: false, targetUserId });
  } else {
    await BlockedUser.create({ blocker: req.user._id, blockedUser: targetUserId });
    return res.json({ success: true, message: 'User blocked successfully', isBlocked: true, targetUserId });
  }
});

/**
 * @desc    Create New Group Chat
 * @route   POST /api/chat/group
 * @access  Private
 */
const createGroupChat = asyncHandler(async (req, res) => {
  const { name, users: usersJson, icon } = req.body;

  if (!name || !usersJson) {
    res.status(400);
    throw new Error('Group name and user list are required');
  }

  let users = typeof usersJson === 'string' ? JSON.parse(usersJson) : usersJson;
  if (users.length < 1) {
    res.status(400);
    throw new Error('More than 1 user is required to create a group chat');
  }

  if (!users.includes(req.user._id.toString())) {
    users.push(req.user._id.toString());
  }

  const groupChat = await Chat.create({
    chatName: name,
    isGroupChat: true,
    users: users,
    groupAdmin: req.user._id,
    groupAdmins: [req.user._id],
    groupIcon: icon || '',
  });

  const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password');

  return res.status(201).json({ success: true, chat: fullGroupChat });
});

/**
 * @desc    Update Group Info (Name & Icon)
 * @route   PUT /api/chat/group/info
 * @access  Private (Group Admin only)
 */
const updateGroupInfo = asyncHandler(async (req, res) => {
  const { chatId, chatName, groupIcon } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  const isAdmin =
    (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
    (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString()));

  if (!isAdmin) {
    res.status(403);
    throw new Error('Only group admins can update group info');
  }

  if (chatName) chat.chatName = chatName;
  if (groupIcon !== undefined) chat.groupIcon = groupIcon;

  await chat.save();

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({ success: true, message: 'Group info updated', chat: updatedChat });
});

/**
 * @desc    Add Member to Group
 * @route   PUT /api/chat/group/add
 * @access  Private (Group Admin only)
 */
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  const isAdmin =
    (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
    (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString()));

  if (!isAdmin) {
    res.status(403);
    throw new Error('Only group admins can add members');
  }

  if (!chat.users.includes(userId)) {
    chat.users.push(userId);
    await chat.save();
  }

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({ success: true, message: 'User added to group', chat: updatedChat });
});

/**
 * @desc    Remove Member from Group
 * @route   PUT /api/chat/group/remove
 * @access  Private (Group Admin only)
 */
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  const isAdmin =
    (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
    (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString())) ||
    req.user._id.toString() === userId.toString();

  if (!isAdmin) {
    res.status(403);
    throw new Error('Only group admins can remove members');
  }

  chat.users = chat.users.filter((id) => id.toString() !== userId.toString());
  chat.groupAdmins = (chat.groupAdmins || []).filter((id) => id.toString() !== userId.toString());
  await chat.save();

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({ success: true, message: 'User removed from group', chat: updatedChat });
});

/**
 * @desc    Promote Member to Group Admin
 * @route   PUT /api/chat/group/promote
 * @access  Private (Group Admin only)
 */
const promoteGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  const isCurrentAdmin =
    (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
    (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString()));

  if (!isCurrentAdmin) {
    res.status(403);
    throw new Error('Only group admins can promote members');
  }

  if (!chat.groupAdmins) chat.groupAdmins = [chat.groupAdmin];
  if (!chat.groupAdmins.some((id) => id.toString() === userId.toString())) {
    chat.groupAdmins.push(userId);
    await chat.save();
  }

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({ success: true, message: 'User promoted to group admin', chat: updatedChat });
});

/**
 * @desc    Demote Admin to Regular Member
 * @route   PUT /api/chat/group/demote
 * @access  Private (Group Admin only)
 */
const demoteGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  const isCurrentAdmin =
    (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
    (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString()));

  if (!isCurrentAdmin) {
    res.status(403);
    throw new Error('Only group admins can demote members');
  }

  chat.groupAdmins = (chat.groupAdmins || []).filter((id) => id.toString() !== userId.toString());
  await chat.save();

  const updatedChat = await Chat.findById(chatId)
    .populate('users', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password')
    .populate('latestMessage');

  return res.json({ success: true, message: 'Admin role removed', chat: updatedChat });
});

module.exports = {
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
};
