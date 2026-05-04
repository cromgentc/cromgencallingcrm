const express = require('express')
const { getEmailSmtpStatus, getEmailTracking, listEmailCampaigns, saveEmailCampaign, scheduleEmailCampaign, sendEmailCampaign, syncEmailInbox, trackEmailOpen, updateEmailCampaign } = require('../controllers/marketingController')
const { allowRoles, protect } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/email/send', (req, res) => {
  res.json({
    message: 'Email send API ready hai. Browser address bar GET ke liye nahi hai; Send Now button ya POST request use karo.',
    method: 'POST',
    endpoint: '/api/marketing/email/send',
    bodyExample: {
      name: 'Email Campaign',
      subject: 'Hello',
      body: 'Hi {{name}}, thank you for connecting with us.',
      recipients: [{ name: 'Rahul', email: 'rahul@example.com' }],
    },
  })
})
router.get('/email/open/:campaignId', trackEmailOpen)
router.get('/email/smtp-status', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getEmailSmtpStatus)
router.get('/email/tracking', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), getEmailTracking)
router.post('/email/send', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), sendEmailCampaign)
router.post('/email/sync-inbox', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), syncEmailInbox)
router.get('/email/campaigns', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), listEmailCampaigns)
router.post('/email/campaigns', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), saveEmailCampaign)
router.post('/email/schedule', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), scheduleEmailCampaign)
router.patch('/email/campaigns/:campaignId', protect, allowRoles('admin', 'manager', 'teamleader', 'staff'), updateEmailCampaign)

module.exports = router
