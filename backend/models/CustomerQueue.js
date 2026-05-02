const mongoose = require('mongoose')

const customerQueueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'completed'],
      default: 'pending',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String, default: '' },
    assignedCallId: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByRole: { type: String, enum: ['admin', 'manager', 'teamleader', 'staff'], default: 'admin' },
    scopeManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    scopeTeamLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

module.exports = mongoose.model('CustomerQueue', customerQueueSchema)
