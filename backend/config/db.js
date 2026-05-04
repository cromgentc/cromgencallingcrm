const mongoose = require('mongoose')
const CustomerQueue = require('../models/CustomerQueue')
const { seedDashboardData } = require('../seed/dashboardSeed')

async function ensureCustomerQueueIndexes() {
  const indexes = await CustomerQueue.collection.indexes()
  const phoneIndex = indexes.find((index) => index.name === 'phone_1')

  if (phoneIndex?.unique) {
    await CustomerQueue.collection.dropIndex('phone_1')
  }

  await CustomerQueue.collection.createIndex({ phone: 1 }, { name: 'phone_1' })
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise()
    return mongoose.connection
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI is required in backend/.env')
  }

  await mongoose.connect(mongoUri)
  console.log('MongoDB connected')

  await ensureCustomerQueueIndexes()
  await seedDashboardData()

  return mongoose.connection
}

module.exports = { connectDB }
