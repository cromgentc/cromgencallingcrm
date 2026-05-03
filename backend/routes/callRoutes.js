const express = require('express')
const { createCall, deleteCall, deleteCalls, getCalls, updateCall } = require('../controllers/callController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getCalls)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), createCall)
router.patch('/:callId', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), updateCall)
router.delete('/bulk-delete', protect, allowRoles('admin'), deleteCalls)
router.delete('/:callId', protect, allowRoles('admin'), deleteCall)

module.exports = router
