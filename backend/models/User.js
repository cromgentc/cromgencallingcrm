const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    staffId: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'manager', 'teamleader', 'staff'],
      default: 'staff',
    },
    phone: { type: String, default: '' },
    team: { type: String, default: '' },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeamLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return
  }

  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
