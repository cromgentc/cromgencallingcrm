const express = require('express')
const { bulkCreateCustomers, createCustomer, getCustomers, importCustomersFromUrl } = require('../controllers/customerController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, getCustomers)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader'), createCustomer)
router.post('/bulk', protect, allowRoles('admin', 'manager', 'teamleader'), bulkCreateCustomers)
router.post('/import-url', protect, allowRoles('admin', 'manager', 'teamleader'), importCustomersFromUrl)

module.exports = router
