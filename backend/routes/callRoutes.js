const express = require('express')
const multer = require('multer')
const { createCall, deleteCall, deleteCalls, downloadRecording, getCalls, getRecording, updateCall, uploadRecording } = require('../controllers/callController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

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

router.get('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getCalls)
router.post('/', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), createCall)
router.patch('/:callId', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), updateCall)
router.post('/:callId/recording', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), upload.single('recording'), uploadRecording)
router.delete('/bulk-delete', protect, allowRoles('admin'), deleteCalls)
router.delete('/:callId', protect, allowRoles('admin'), deleteCall)
router.get('/:callId/recording/download', protect, allowRoles('admin'), downloadRecording)
router.get('/:callId/recording', protect, allowRoles('admin', 'manager', 'teamleader'), getRecording)

module.exports = router
