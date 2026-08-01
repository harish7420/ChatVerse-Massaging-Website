const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAdminUsersList,
  toggleSuspendUser,
  deleteUserByAdmin,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsersList);
router.put('/users/:id/suspend', toggleSuspendUser);
router.delete('/users/:id', deleteUserByAdmin);

module.exports = router;
