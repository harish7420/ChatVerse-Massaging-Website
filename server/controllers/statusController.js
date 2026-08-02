const asyncHandler = require('../utils/asyncHandler');
const Status = require('../models/Status');

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

  const { type, content, mediaUrl, bgColor } = req.body;

  const newStatus = await Status.create({
    user: req.user._id,
    type: type || (mediaUrl ? 'image' : 'text'),
    content: content || '',
    mediaUrl: mediaUrl || '',
    bgColor: bgColor || 'from-brand-600 to-indigo-800',
    viewers: [],
  });

  const populatedStatus = await Status.findById(newStatus._id).populate('user', 'username avatar email isAdmin');
  return res.status(201).json({ success: true, status: populatedStatus });
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

  const status = await Status.findById(statusId);
  if (status) {
    const alreadyViewed = status.viewers.some((v) => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      status.viewers.push({ user: req.user._id, viewedAt: new Date() });
      await status.save();
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

  await Status.deleteOne({ _id: statusId, user: req.user._id });

  res.json({ success: true, message: 'Status deleted successfully' });
});

module.exports = {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
};

