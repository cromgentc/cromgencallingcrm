const express = require('express')
const { createLead, getLeads, updateLead } = require('../controllers/leadController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, getLeads)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), createLead)
router.patch('/:leadId', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), updateLead)

module.exports = router
