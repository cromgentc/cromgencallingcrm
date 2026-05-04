const EmailCampaign = require('../models/EmailCampaign')
const { sendBulkEmail } = require('./emailMarketingService')

let schedulerStarted = false

async function sendDueCampaigns() {
  const dueCampaigns = await EmailCampaign.find({
    status: 'Scheduled',
    folder: 'scheduled',
    scheduledAt: { $lte: new Date() },
  }).limit(10)

  for (const campaign of dueCampaigns) {
    try {
      const results = await sendBulkEmail({
        subject: campaign.subject,
        body: campaign.body,
        recipients: campaign.recipients,
        userId: campaign.createdBy,
      })
      const rejected = results.filter((item) => item.rejected?.length)

      campaign.status = 'Sent'
      campaign.folder = 'sent'
      campaign.sentAt = new Date()
      campaign.sent = results.length - rejected.length
      campaign.rejected = rejected.length
      campaign.results = results
      await campaign.save()
    } catch (error) {
      campaign.status = 'Ready'
      campaign.folder = 'ready'
      campaign.replies = [
        ...(campaign.replies || []),
        {
          type: 'system',
          body: error.message || 'Scheduled email send failed.',
          createdAt: new Date(),
        },
      ]
      await campaign.save()
    }
  }
}

function startEmailScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true

  setInterval(() => {
    sendDueCampaigns().catch((error) => {
      console.error('Email scheduler failed:', error.message)
    })
  }, 30000)
}

module.exports = { sendDueCampaigns, startEmailScheduler }
