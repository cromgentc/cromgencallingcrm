const express = require('express')
const { exchangeGoogleCode, getCalendarEvents } = require('../controllers/googleController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/calendar/events', protect, getCalendarEvents)
router.post('/oauth/token', protect, exchangeGoogleCode)

module.exports = router
