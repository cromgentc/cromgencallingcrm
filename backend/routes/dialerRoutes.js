const express = require('express')
const { authorizeSession, completeCall, connectCall, createOutcall, createSession, getDialerMessages, getNextCall, replyDialerMessage, updateStatus } = require('../controllers/dialerController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/sessions', protect, createSession)
router.post('/:token/authorize', authorizeSession)
router.patch('/:token/status', updateStatus)
router.post('/:token/next-call', getNextCall)
router.post('/:token/outcall', createOutcall)
router.get('/:token/messages', getDialerMessages)
router.post('/:token/messages/:messageId/reply', replyDialerMessage)
router.post('/:token/calls/:callId/connect', connectCall)
router.post('/:token/calls/:callId/complete', completeCall)

module.exports = router
