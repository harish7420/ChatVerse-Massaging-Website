const asyncHandler = require('../utils/asyncHandler');
const Chat = require('../models/Chat');
const User = require('../models/User');

/**
 * @desc    Access or Create 1-on-1 Chat
 * @route   POST /api/chat
 * @access  Private
 */
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('UserId parameter is required');
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate('users', '-password')
    .populate('latestMessage');

  isChat = await User.populate(isChat, {
    path: 'latestMessage.sender',
    select: 'username avatar email',
  });

  if (isChat.length > 0) {
    return res.json({ success: true, chat: isChat[0] });
  } else {
    const chatData = {
      chatName: 'Direct Chat',
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
    return res.status(201).json({ success: true, chat: fullChat });
  }
});

/**
 * @desc    Fetch all chats for logged-in user
 * @route   GET /api/chat
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

  return res.json({ success: true, chats: populatedChats });
});

/**
 * @desc    Toggle Chat Pin/Archive/Mute
 * @route   PUT /api/chat/:id/action
 * @access  Private
 */
const toggleChatMeta = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'pin', 'archive', 'mute'
  const chatId = req.params.id;
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

  // Include current user in group
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
  toggleChatMeta,
  createGroupChat,
  updateGroupInfo,
  addToGroup,
  removeFromGroup,
  promoteGroupAdmin,
  demoteGroupAdmin,
};

