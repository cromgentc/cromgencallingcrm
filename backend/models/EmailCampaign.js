const mongoose = require('mongoose')

const recipientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false },
)

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    recipients: { type: [recipientSchema], default: [] },
    status: { type: String, enum: ['Draft', 'Ready', 'Scheduled', 'Sent', 'Inbox', 'Spam'], default: 'Draft' },
    folder: { type: String, enum: ['draft', 'ready', 'scheduled', 'sent', 'inbox', 'spam'], default: 'draft' },
    starred: { type: Boolean, default: false },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    sent: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    lastOpenedAt: { type: Date },
    opens: { type: Array, default: [] },
    results: { type: Array, default: [] },
    replies: { type: Array, default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

emailCampaignSchema.index({ folder: 1, status: 1, scheduledAt: 1 })
emailCampaignSchema.index({ createdBy: 1, folder: 1, updatedAt: -1 })

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema)
