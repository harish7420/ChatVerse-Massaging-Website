const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    bgColor: {
      type: String,
      default: 'from-brand-600 to-indigo-800',
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL index
    },
  },
  { timestamps: true }
);

const Status = mongoose.model('Status', statusSchema);
module.exports = Status;
