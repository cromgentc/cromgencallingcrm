const express = require('express')
const { getMe, login, registerAccount, registerAdmin, updateMe } = require('../controllers/authController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/login', login)
router.post('/admin/register', registerAdmin)
router.get('/me', protect, getMe)
router.patch('/me', protect, updateMe)
router.post('/register', protect, allowRoles('admin', 'manager', 'teamleader'), registerAccount)
router.post('/staff', protect, allowRoles('admin', 'manager', 'teamleader'), registerAccount)

module.exports = router
