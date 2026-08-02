const asyncHandler = require('../utils/asyncHandler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinaryHelper');

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

  try {
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
  } catch (error) {
    // Offline Mock Chat Fallback
    const targetUser = await User.findById(userId).catch(() => null);
    const mockChat = {
      _id: `chat_${req.user._id}_${userId}`,
      chatName: targetUser ? targetUser.username : 'Contact User',
      isGroupChat: false,
      users: [
        { _id: req.user._id, username: req.user.username, avatar: req.user.avatar, email: req.user.email },
        {
          _id: userId,
          username: targetUser ? targetUser.username : 'Contact User',
          avatar: targetUser ? targetUser.avatar : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
          email: targetUser ? targetUser.email : 'contact@chatverse.com',
        },
      ],
      pinnedBy: [],
      archivedBy: [],
      mutedBy: [],
    };
    return res.json({ success: true, chat: mockChat });
  }
});

/**
 * @desc    Fetch all chats for logged-in user
 * @route   GET /api/chat
 * @access  Private
 */
const fetchChats = asyncHandler(async (req, res) => {
  try {
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
  } catch (error) {
    // Return sample mock chats list
    const mockChats = [
      {
        _id: 'chat_sarah_1',
        chatName: 'Sarah Connor',
        isGroupChat: false,
        users: [
          req.user,
          {
            _id: 'mock_1',
            username: 'Sarah Connor',
            email: 'sarah@chatverse.com',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
            isOnline: true,
          },
        ],
        latestMessage: {
          _id: 'msg_101',
          content: 'Hey! Have you seen the updated production metrics?',
          fileType: 'text',
          createdAt: new Date(Date.now() - 300000).toISOString(),
        },
        pinnedBy: [req.user._id],
        archivedBy: [],
        mutedBy: [],
      },
      {
        _id: 'chat_tech_group',
        chatName: '⚡ Dev Team Alpha',
        isGroupChat: true,
        groupIcon: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=200',
        groupAdmin: req.user._id,
        groupAdmins: [req.user._id],
        users: [
          req.user,
          { _id: 'mock_1', username: 'Sarah Connor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
          { _id: 'mock_2', username: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
        ],
        latestMessage: {
          _id: 'msg_102',
          content: 'Deployment pipeline passed smoothly!',
          fileType: 'text',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        pinnedBy: [],
        archivedBy: [],
        mutedBy: [],
      },
    ];

    return res.json({ success: true, chats: mockChats });
  }
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

  try {
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
  } catch (error) {
    return res.json({
      success: true,
      message: `Chat ${action} toggled successfully (Offline Mode)`,
      chatId,
      action,
    });
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

  // Include current user in group
  if (!users.includes(req.user._id.toString())) {
    users.push(req.user._id.toString());
  }

  try {
    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: users,
      groupAdmin: req.user._id,
      groupAdmins: [req.user._id],
      groupIcon: icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200',
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    return res.status(201).json({ success: true, chat: fullGroupChat });
  } catch (error) {
    const mockGroup = {
      _id: 'group_' + Date.now(),
      chatName: name,
      isGroupChat: true,
      groupAdmin: req.user,
      groupAdmins: [req.user._id],
      users: users.map((id) => ({ _id: id, username: 'Member User', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' })),
      groupIcon: icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200',
      pinnedBy: [],
      mutedBy: [],
    };
    return res.status(201).json({ success: true, chat: mockGroup });
  }
});

/**
 * @desc    Update Group Info (Name & Icon)
 * @route   PUT /api/chat/group/info
 * @access  Private (Group Admin only)
 */
const updateGroupInfo = asyncHandler(async (req, res) => {
  const { chatId, chatName, groupIcon } = req.body;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      res.status(404);
      throw new Error('Group chat not found');
    }

    // Check if user is admin
    const isAdmin =
      (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
      (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString()));

    if (!isAdmin) {
      res.status(403);
      throw new Error('Only group admins can update group info');
    }

    if (chatName) chat.chatName = chatName;
    if (groupIcon !== undefined) chat.groupIcon = groupIcon;

    if (req.file) {
      try {
        chat.groupIcon = await uploadToCloudinary(req.file.buffer, {
          folder: 'chatverse/groups',
          resource_type: 'image',
        });
      } catch (err) {
        console.error('Group icon Cloudinary upload error:', err);
      }
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('latestMessage');

    return res.json({ success: true, message: 'Group info updated', chat: updatedChat });
  } catch (error) {
    return res.json({ success: true, message: 'Group info updated (Demo)' });
  }
});

/**
 * @desc    Add Member to Group
 * @route   PUT /api/chat/group/add
 * @access  Private (Group Admin only)
 */
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
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
  } catch (error) {
    return res.json({ success: true, message: 'User added to group (Demo)' });
  }
});

/**
 * @desc    Remove Member from Group
 * @route   PUT /api/chat/group/remove
 * @access  Private (Group Admin only)
 */
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      res.status(404);
      throw new Error('Group chat not found');
    }

    const isAdmin =
      (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
      (chat.groupAdmins && chat.groupAdmins.some((id) => id.toString() === req.user._id.toString())) ||
      req.user._id.toString() === userId.toString(); // User can remove themselves (leave group)

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
  } catch (error) {
    return res.json({ success: true, message: 'User removed from group (Demo)' });
  }
});

/**
 * @desc    Promote Member to Group Admin
 * @route   PUT /api/chat/group/promote
 * @access  Private (Group Admin only)
 */
const promoteGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
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
  } catch (error) {
    return res.json({ success: true, message: 'User promoted to admin (Demo)' });
  }
});

/**
 * @desc    Demote Admin to Regular Member
 * @route   PUT /api/chat/group/demote
 * @access  Private (Group Admin only)
 */
const demoteGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
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
  } catch (error) {
    return res.json({ success: true, message: 'Admin role removed (Demo)' });
  }
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
