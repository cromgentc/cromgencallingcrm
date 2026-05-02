require('dotenv').config()

const mongoose = require('mongoose')
const User = require('../models/User')
const { generateStaffId } = require('../utils/staffId')

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

const accounts = [
  {
    key: 'admin',
    name: 'Super Admin',
    email: 'admin@calltrack.local',
    password: 'admin12345',
    role: 'admin',
  },
  {
    key: 'manager',
    name: 'Manager',
    email: 'manager@calltrack.local',
    password: 'manager12345',
    role: 'manager',
    team: 'Sales A',
    parentKey: 'admin',
  },
  {
    key: 'teamleader',
    name: 'Team Leader',
    email: 'tl@calltrack.local',
    password: 'tl12345',
    role: 'teamleader',
    team: 'Sales A',
    parentKey: 'manager',
  },
  {
    key: 'staff',
    name: 'Calling Staff',
    password: 'staff12345',
    role: 'staff',
    staffId: 'CGOB0001',
    phone: '+91 90000 00001',
    team: 'Sales A',
    parentKey: 'teamleader',
  },
]

async function upsertAccount(account, createdByKey) {
  const query = account.role === 'staff' ? { role: 'staff', name: account.name } : { email: account.email }
  const existingUser = await User.findOne(query).select('+password')
  const parent = createdByKey ? await User.findById(createdByKey) : null

  if (existingUser) {
    existingUser.name = account.name
    existingUser.email = account.email
    existingUser.role = account.role
    existingUser.phone = account.phone || existingUser.phone
    existingUser.team = account.team || existingUser.team
    existingUser.assignedManager = account.role === 'teamleader' ? parent?._id : account.role === 'staff' ? parent?.assignedManager : undefined
    existingUser.assignedTeamLeader = account.role === 'staff' ? parent?._id : undefined
    existingUser.createdBy = createdByKey || existingUser.createdBy
    existingUser.password = account.password
    existingUser.isActive = true

    if (account.staffId) {
      const staffIdOwner = await User.findOne({ staffId: account.staffId, _id: { $ne: existingUser._id } }).lean()

      if (!staffIdOwner) {
        existingUser.staffId = account.staffId
      }
    }

    await existingUser.save()
    return existingUser
  }

  const staffId = account.role === 'staff' ? account.staffId || (await generateStaffId()) : undefined
  return User.create({
    name: account.name,
    email: account.email,
    password: account.password,
    role: account.role,
    staffId,
    phone: account.phone,
    team: account.team,
    assignedManager: account.role === 'teamleader' ? parent?._id : account.role === 'staff' ? parent?.assignedManager : undefined,
    assignedTeamLeader: account.role === 'staff' ? parent?._id : undefined,
    createdBy: createdByKey,
  })
}

async function run() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI is required in backend/.env')
  }

  await mongoose.connect(mongoUri)

  const createdAccounts = []
  const usersByKey = {}

  for (const account of accounts) {
    const user = await upsertAccount(account, usersByKey[account.parentKey]?._id)
    usersByKey[account.key] = user
    createdAccounts.push({
      name: user.name,
      role: user.role,
      login: user.staffId || user.email,
      password: account.password,
    })
  }

  console.table(createdAccounts)
  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error.message)
  await mongoose.disconnect()
  process.exit(1)
})
