require('dotenv').config()

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
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
const marketingRoutes = require('./routes/marketingRoutes')
const reportRoutes = require('./routes/reportRoutes')
const staffRoutes = require('./routes/staffRoutes')
const settingRoutes = require('./routes/settingRoutes')
const googleRoutes = require('./routes/googleRoutes')
const whatsappRoutes = require('./routes/whatsappRoutes')
const pbxRoutes = require('./routes/pbxRoutes')
const { startEmailScheduler } = require('./services/emailSchedulerService')

const app = express()
const PORT = process.env.PORT || 5000
let startupPromise = null
const frontendDistPath = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : path.resolve(__dirname, '../frontend/dist')
const frontendIndexPath = path.join(frontendDistPath, 'index.html')

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
app.use('/api/marketing', marketingRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/pbx', pbxRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/settings', settingRoutes)

app.get(/^\/dailer\/(.+)/, (req, res) => {
  res.redirect(301, `/dialer/${req.params[0]}`)
})

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(frontendIndexPath)
  })
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'calltrack-api',
      message: 'Frontend build not found. Run npm run build before serving the app.',
    })
  })
}

app.use((error, req, res, next) => {
  const duplicateFields = error?.code === 11000 ? Object.keys(error.keyPattern || error.keyValue || {}) : []
  const statusCode = error.statusCode || (duplicateFields.length ? 409 : 500)
  if (statusCode >= 500) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error.message)
  }

  res.status(statusCode).json({
    message: duplicateFields.length ? `${duplicateFields.join(', ')} already exists. Please try again.` : error.message || 'Something went wrong',
  })
})

function startServer({ listen = true, scheduler = true } = {}) {
  if (!startupPromise) {
    startupPromise = connectDB().then(() => {
      if (scheduler) {
        startEmailScheduler()
      }
      return app
    })
  }

  if (listen) {
    startupPromise
      .then(() => {
        app.listen(PORT, () => {
          console.log(`CallTrack API running on http://localhost:${PORT}`)
        })
      })
      .catch((error) => {
        console.error('MongoDB connection failed:', error.message)
        process.exit(1)
      })
  }

  return startupPromise
}

if (require.main === module) {
  startServer()
}

module.exports = app
module.exports.startServer = startServer
