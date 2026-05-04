const express = require('express')
const { createMessage, getMyMessages, replyMessage } = require('../controllers/messageController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/mine', protect, getMyMessages)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), createMessage)
router.post('/:messageId/reply', protect, replyMessage)

module.exports = router
