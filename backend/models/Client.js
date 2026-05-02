const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    companyName: { type: String, required: true, trim: true, index: true },
    companyGst: { type: String, default: '' },
    companyLicenseNumber: { type: String, default: '' },
    openingPositionCount: { type: String, default: '' },
    openingPositionName: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    contactPersonNumber: { type: String, default: '' },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Client', clientSchema)
