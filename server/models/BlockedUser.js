const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

blockedUserSchema.index({ blocker: 1, blockedUser: 1 }, { unique: true });

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);
module.exports = BlockedUser;
