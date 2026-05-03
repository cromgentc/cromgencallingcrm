const Call = require('../models/Call')

const STARTING_CALL_NUMBER = 2051

async function nextCallNumber() {
  const [latest] = await Call.aggregate([
    { $match: { callId: /^CL-\d+$/ } },
    {
      $project: {
        number: {
          $convert: {
            input: { $substr: ['$callId', 3, -1] },
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

  return Math.max(STARTING_CALL_NUMBER - 1, latest?.number || 0) + 1
}

function isDuplicateCallIdError(error) {
  return error?.code === 11000 && Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, 'callId')
}

async function createCallWithUniqueId(payload) {
  let callNumber = await nextCallNumber()

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await Call.create({ ...payload, callId: `CL-${callNumber + attempt}` })
    } catch (error) {
      if (!isDuplicateCallIdError(error)) {
        throw error
      }

      callNumber = await nextCallNumber()
    }
  }

  const error = new Error('Could not generate a unique call ID. Please try again.')
  error.statusCode = 409
  throw error
}

module.exports = { createCallWithUniqueId }
