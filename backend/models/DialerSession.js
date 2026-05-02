const mongoose = require('mongoose')

const dialerSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['not_ready', 'ready', 'on_call', 'outcall'],
      default: 'not_ready',
    },
    authorizedAt: { type: Date },
    lastCallAt: { type: Date },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DialerSession', dialerSessionSchema)
