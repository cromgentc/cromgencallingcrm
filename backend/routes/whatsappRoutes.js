const express = require('express')
const {
  getWhatsAppChats,
  getWhatsAppMessages,
  getWhatsAppStatus,
  resetWhatsAppSession,
  sendWhatsAppMessage,
  startWhatsAppSession,
} = require('../controllers/whatsappController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/status', protect, getWhatsAppStatus)
router.get('/chats', protect, getWhatsAppChats)
router.get('/chats/:chatId/messages', protect, getWhatsAppMessages)
router.post('/chats/:chatId/messages', protect, sendWhatsAppMessage)
router.post('/start', protect, startWhatsAppSession)
router.post('/reset', protect, resetWhatsAppSession)

module.exports = router
