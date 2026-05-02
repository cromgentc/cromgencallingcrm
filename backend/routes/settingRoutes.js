const express = require('express')
const { getCloudinarySetting, saveCloudinarySetting } = require('../controllers/settingController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/cloudinary', protect, allowRoles('admin'), getCloudinarySetting)
router.put('/cloudinary', protect, allowRoles('admin'), saveCloudinarySetting)

module.exports = router
