const express = require('express')
const { bulkDeleteStaff, deleteStaff, getStaff, updateStaff } = require('../controllers/staffController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getStaff)
router.patch('/:staffId', protect, allowRoles('admin', 'manager', 'teamleader'), updateStaff)
router.delete('/:staffId', protect, allowRoles('admin', 'manager', 'teamleader'), deleteStaff)
router.post('/bulk-delete', protect, allowRoles('admin', 'manager', 'teamleader'), bulkDeleteStaff)

module.exports = router
