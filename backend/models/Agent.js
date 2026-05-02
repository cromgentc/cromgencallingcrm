const mongoose = require('mongoose')

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['On Call', 'Available', 'Wrap Up', 'Offline'],
      default: 'Available',
    },
    calls: { type: Number, default: 0 },
    conversion: { type: Number, default: 0 },
    location: { type: String, default: 'Remote' },
    avatar: { type: String, default: 'AG' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Agent', agentSchema)
