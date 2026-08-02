const asyncHandler = require('../utils/asyncHandler');
const Status = require('../models/Status');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinaryHelper');

// In-memory fallback for offline/demo mode when DB is unavailable
let memoryStatuses = [];

/**
 * @desc    Create a new status update
 * @route   POST /api/status
 * @access  Private (Non-Admin only)
 */
const createStatus = asyncHandler(async (req, res) => {
  if (req.user.isAdmin) {
    res.status(403);
    throw new Error('Admin accounts are not allowed to create status updates');
  }

  const { type, content, bgColor } = req.body;
  let mediaUrl = '';
  let statusType = type || 'text';

  if (req.file) {
    const mime = req.file.mimetype;
    if (mime.startsWith('image/')) statusType = 'image';
    else if (mime.startsWith('video/')) statusType = 'video';

    try {
      mediaUrl = await uploadToCloudinary(req.file.buffer, {
        folder: 'chatverse/statuses',
        resource_type: statusType === 'video' ? 'video' : 'image',
      });
    } catch (err) {
      console.error('Status media upload to Cloudinary failed:', err);
    }
  }

  try {
    const newStatus = await Status.create({
      user: req.user._id,
      type: statusType,
      content: content || '',
      mediaUrl,
      bgColor: bgColor || 'from-brand-600 to-indigo-800',
      viewers: [],
    });

    const populatedStatus = await Status.findById(newStatus._id).populate('user', 'username avatar email isAdmin');
    return res.status(201).json({ success: true, status: populatedStatus });
  } catch (error) {
    // Offline Memory Fallback
    const mockStatus = {
      _id: 'status_' + Date.now(),
      user: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        email: req.user.email,
        isAdmin: false,
      },
      type: statusType,
      content: content || '',
      mediaUrl,
      bgColor: bgColor || 'from-brand-600 to-indigo-800',
      viewers: [],
      createdAt: new Date().toISOString(),
    };
    memoryStatuses.unshift(mockStatus);
    return res.status(201).json({ success: true, status: mockStatus });
  }
});

/**
 * @desc    Get all active status updates (created within last 24 hours, non-admin)
 * @route   GET /api/status
 * @access  Private (Non-Admin only)
 */
const getStatuses = asyncHandler(async (req, res) => {
  if (req.user.isAdmin) {
    res.status(403);
    throw new Error('Admin accounts do not have access to the Status feature');
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const statuses = await Status.find({ createdAt: { $gte: twentyFourHoursAgo } })
      .populate('user', 'username avatar email isAdmin')
      .populate('viewers.user', 'username avatar email')
      .sort({ createdAt: -1 });

    // Filter out statuses from admin users if any exist
    const userStatuses = statuses.filter((st) => st.user && !st.user.isAdmin);

    // Group statuses by user
    const groupedMap = new Map();
    userStatuses.forEach((st) => {
      const uId = st.user._id.toString();
      if (!groupedMap.has(uId)) {
        groupedMap.set(uId, {
          user: st.user,
          items: [],
        });
      }
      groupedMap.get(uId).items.push(st);
    });

    const result = Array.from(groupedMap.values());
    return res.json({ success: true, statuses: result });
  } catch (error) {
    // Filter memory statuses created within last 24 hours
    const validMemory = memoryStatuses.filter(
      (st) => new Date(st.createdAt) >= twentyFourHoursAgo && st.user && !st.user.isAdmin
    );

    const groupedMap = new Map();
    validMemory.forEach((st) => {
      const uId = st.user._id.toString();
      if (!groupedMap.has(uId)) {
        groupedMap.set(uId, {
          user: st.user,
          items: [],
        });
      }
      groupedMap.get(uId).items.push(st);
    });

    const result = Array.from(groupedMap.values());
    return res.json({ success: true, statuses: result });
  }
});

/**
 * @desc    Mark a status update as viewed by logged-in user
 * @route   POST /api/status/:id/view
 * @access  Private (Non-Admin only)
 */
const viewStatus = asyncHandler(async (req, res) => {
  if (req.user.isAdmin) {
    res.status(403);
    throw new Error('Admin accounts do not have access to the Status feature');
  }

  const statusId = req.params.id;

  try {
    const status = await Status.findById(statusId);
    if (status) {
      const alreadyViewed = status.viewers.some((v) => v.user.toString() === req.user._id.toString());
      if (!alreadyViewed) {
        status.viewers.push({ user: req.user._id, viewedAt: new Date() });
        await status.save();
      }
    }
  } catch (error) {
    const memStatus = memoryStatuses.find((s) => s._id === statusId);
    if (memStatus) {
      const alreadyViewed = memStatus.viewers.some((v) => v.user._id.toString() === req.user._id.toString());
      if (!alreadyViewed) {
        memStatus.viewers.push({
          user: {
            _id: req.user._id,
            username: req.user.username,
            avatar: req.user.avatar,
          },
          viewedAt: new Date().toISOString(),
        });
      }
    }
  }

  res.json({ success: true, message: 'Status marked as viewed' });
});

/**
 * @desc    Delete a status update
 * @route   DELETE /api/status/:id
 * @access  Private (Non-Admin only)
 */
const deleteStatus = asyncHandler(async (req, res) => {
  const statusId = req.params.id;

  try {
    await Status.deleteOne({ _id: statusId, user: req.user._id });
  } catch (error) {
    memoryStatuses = memoryStatuses.filter((s) => !(s._id === statusId && s.user._id.toString() === req.user._id.toString()));
  }

  res.json({ success: true, message: 'Status deleted successfully' });
});

module.exports = {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
};
