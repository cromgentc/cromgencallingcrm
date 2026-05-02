const mongoose = require('mongoose')

const timelineEventSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('TimelineEvent', timelineEventSchema)
