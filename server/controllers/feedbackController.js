const asyncHandler = require('../utils/asyncHandler');
const Feedback = require('../models/Feedback');

/**
 * @desc    Submit user feedback
 * @route   POST /api/feedback
 * @access  Private / Public
 */
const submitFeedback = asyncHandler(async (req, res) => {
  const { rating, category, message } = req.body;

  if (!rating || !message) {
    return res.status(400).json({ success: false, message: 'Rating and message are required' });
  }

  try {
    const feedback = await Feedback.create({
      user: req.user ? req.user._id : null,
      rating: Number(rating),
      category: category || 'general',
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback,
    });
  } catch (error) {
    // In-memory response for demo/mock mode
    const mockFeedback = {
      _id: 'fb_' + Date.now(),
      rating,
      category,
      message,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! (Demo Mode)',
      feedback: mockFeedback,
    });
  }
});

/**
 * @desc    Get all feedback (Admin)
 * @route   GET /api/feedback
 * @access  Private / Admin
 */
const getAllFeedback = asyncHandler(async (req, res) => {
  try {
    const feedbackList = await Feedback.find()
      .populate('user', 'username email avatar')
      .sort({ createdAt: -1 });

    return res.json({ success: true, feedback: feedbackList });
  } catch (error) {
    // Mock feedback list for demo mode
    const mockList = [
      {
        _id: 'fb_1',
        rating: 5,
        category: 'ux',
        message: 'Love the new WhatsApp voice notes and themes! Great work.',
        status: 'new',
        user: { username: 'Alex Johnson', email: 'alex@example.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        _id: 'fb_2',
        rating: 4,
        category: 'feature',
        message: 'Could you add custom chat wallpaper selection in settings?',
        status: 'reviewed',
        user: { username: 'Sarah Connor', email: 'sarah@example.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    return res.json({ success: true, feedback: mockList });
  }
});

/**
 * @desc    Update feedback status (Admin)
 * @route   PATCH /api/feedback/:id
 * @access  Private / Admin
 */
const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const feedback = await Feedback.findByIdAndUpdate(id, { status }, { new: true });
    return res.json({ success: true, feedback });
  } catch (error) {
    return res.json({ success: true, message: 'Status updated (Demo Mode)', id, status });
  }
});

module.exports = {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
};
