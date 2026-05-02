const express = require('express')
const { getReports } = require('../controllers/reportController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, allowRoles('manager', 'teamleader', 'staff'), getReports)

module.exports = router
