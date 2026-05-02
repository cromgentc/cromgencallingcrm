const mongoose = require('mongoose')

const callSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, unique: true, index: true },
    customer: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    agent: { type: String, required: true, trim: true },
    stage: { type: String, default: 'New Call' },
    duration: { type: String, default: '00:00' },
    sentiment: {
      type: String,
      enum: ['Interested', 'Hot Lead', 'Not Interested', 'No Response', 'Call Disconnected', 'Callback', 'Call Handling', 'Neutral'],
      default: 'Neutral',
    },
    remark: { type: String, default: '' },
    completedAt: { type: Date },
    recordingUrl: { type: String, default: '' },
    recordingPublicId: { type: String, default: '' },
    recordingFormat: { type: String, default: '' },
    recordingBytes: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Call', callSchema)
