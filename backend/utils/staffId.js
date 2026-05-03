const User = require('../models/User')

async function generateStaffId() {
  const [latest] = await User.aggregate([
    { $match: { staffId: /^CGOB\d+$/ } },
    {
      $project: {
        number: {
          $convert: {
            input: { $substr: ['$staffId', 4, -1] },
            to: 'int',
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $sort: { number: -1 } },
    { $limit: 1 },
  ])

  const nextNumber = String((latest?.number || 0) + 1).padStart(4, '0')

  return `CGOB${nextNumber}`
}

function isDuplicateStaffIdError(error) {
  return error?.code === 11000 && Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, 'staffId')
}

async function createUserWithUniqueStaffId(payload) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const staffId = await generateStaffId()
      return await User.create({ ...payload, staffId })
    } catch (error) {
      if (!isDuplicateStaffIdError(error)) {
        throw error
      }
    }
  }

  const error = new Error('Could not generate a unique staff ID. Please try again.')
  error.statusCode = 409
  throw error
}

module.exports = { createUserWithUniqueStaffId, generateStaffId }
