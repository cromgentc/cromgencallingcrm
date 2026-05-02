const mongoose = require('mongoose')

const leadBucketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    leadName: { type: String, trim: true },
    company: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    positionRole: { type: String, default: '' },
    interviewDateTime: { type: String, default: '' },
    candidateId: { type: String, default: '' },
    qualification: { type: String, default: '' },
    skills: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },
    experience: { type: String, default: '' },
    leadSource: { type: String, default: 'Website' },
    leadOwner: { type: String, default: 'Unassigned' },
    status: { type: String, default: 'Open' },
    industry: { type: String, default: '' },
    city: { type: String, default: '' },
    count: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('LeadBucket', leadBucketSchema)
