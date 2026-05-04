const express = require('express')
const { originateCall } = require('../controllers/pbxController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/originate', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), originateCall)

module.exports = router
