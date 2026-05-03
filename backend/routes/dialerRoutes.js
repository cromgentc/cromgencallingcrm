const express = require('express')
const multer = require('multer')
const { authorizeSession, completeCall, connectCall, createOutcall, createSession, getDialerMessages, getNextCall, replyDialerMessage, updateStatus, uploadDialerRecording } = require('../controllers/dialerController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true)
      return
    }

    cb(new Error('Only audio recording files are allowed'))
  },
})

router.post('/sessions', protect, createSession)
router.post('/:token/authorize', authorizeSession)
router.patch('/:token/status', updateStatus)
router.post('/:token/next-call', getNextCall)
router.post('/:token/outcall', createOutcall)
router.get('/:token/messages', getDialerMessages)
router.post('/:token/messages/:messageId/reply', replyDialerMessage)
router.post('/:token/calls/:callId/connect', connectCall)
router.post('/:token/calls/:callId/complete', completeCall)
router.post('/:token/calls/:callId/recording', upload.single('recording'), uploadDialerRecording)

module.exports = router
