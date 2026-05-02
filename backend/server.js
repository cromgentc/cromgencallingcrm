require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')
const callRoutes = require('./routes/callRoutes')
const clientRoutes = require('./routes/clientRoutes')
const agentRoutes = require('./routes/agentRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const customerRoutes = require('./routes/customerRoutes')
const dialerRoutes = require('./routes/dialerRoutes')
const authRoutes = require('./routes/authRoutes')
const leadRoutes = require('./routes/leadRoutes')
const messageRoutes = require('./routes/messageRoutes')
const reportRoutes = require('./routes/reportRoutes')
const staffRoutes = require('./routes/staffRoutes')
const settingRoutes = require('./routes/settingRoutes')
const googleRoutes = require('./routes/googleRoutes')
const whatsappRoutes = require('./routes/whatsappRoutes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'calltrack-api',
    database: process.env.MONGODB_URI || process.env.MONGO_URI ? 'mongodb configured' : 'mongodb missing',
  })
})

app.use('/api/google', googleRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/dialer', dialerRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/calls', callRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/settings', settingRoutes)

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    message: error.message || 'Something went wrong',
  })
})

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CallTrack API running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  })
