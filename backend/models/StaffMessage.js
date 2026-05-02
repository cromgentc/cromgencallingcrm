const mongoose = require('mongoose')

const staffMessageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromName: { type: String, required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    readAt: { type: Date },
  },
  { timestamps: true },
)

module.exports = mongoose.model('StaffMessage', staffMessageSchema)
