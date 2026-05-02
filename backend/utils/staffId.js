const User = require('../models/User')

async function generateStaffId() {
  const lastStaff = await User.findOne({ staffId: /^CGOB\d{4}$/ }).sort({ staffId: -1 }).lean()
  const lastNumber = lastStaff ? Number(lastStaff.staffId.replace('CGOB', '')) : 0
  const nextNumber = String(lastNumber + 1).padStart(4, '0')

  return `CGOB${nextNumber}`
}

module.exports = { generateStaffId }
