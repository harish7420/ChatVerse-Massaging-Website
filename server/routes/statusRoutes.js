const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { createStatus, getStatuses, viewStatus, deleteStatus } = require('../controllers/statusController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', upload.single('media'), createStatus);
router.get('/', getStatuses);
router.post('/:id/view', viewStatus);
router.delete('/:id', deleteStatus);

module.exports = router;
