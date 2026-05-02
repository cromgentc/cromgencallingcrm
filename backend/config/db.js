const mongoose = require('mongoose')
const { seedDashboardData } = require('../seed/dashboardSeed')

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI is required in backend/.env')
  }

  await mongoose.connect(mongoUri)
  console.log('MongoDB connected')

  await seedDashboardData()
}

module.exports = { connectDB }
