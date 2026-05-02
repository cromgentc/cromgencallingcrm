const express = require('express')
const { createClient, deleteClient, getClients, updateClient } = require('../controllers/clientController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getClients)
router.post('/', protect, allowRoles('admin'), createClient)
router.patch('/:clientId', protect, allowRoles('admin'), updateClient)
router.delete('/:clientId', protect, allowRoles('admin'), deleteClient)

module.exports = router
