const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
} = require('../controllers/feedbackController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, submitFeedback);
router.get('/', protect, adminOnly, getAllFeedback);
router.patch('/:id', protect, adminOnly, updateFeedbackStatus);

module.exports = router;
