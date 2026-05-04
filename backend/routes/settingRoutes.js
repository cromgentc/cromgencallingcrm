const express = require('express')
const { getCloudinarySetting, getSmtpSetting, saveCloudinarySetting, saveSmtpSetting } = require('../controllers/settingController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/cloudinary', protect, allowRoles('admin'), getCloudinarySetting)
router.put('/cloudinary', protect, allowRoles('admin'), saveCloudinarySetting)
router.get('/smtp', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getSmtpSetting)
router.put('/smtp', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), saveSmtpSetting)

module.exports = router
