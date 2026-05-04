const { getSmtpStatus, sendBulkEmail } = require('../services/emailMarketingService')
const { syncGmailInbox } = require('../services/emailInboxService')
const EmailCampaign = require('../models/EmailCampaign')

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients)) {
    return []
  }

  const seen = new Set()
  return recipients
    .map((recipient) => ({
      name: String(recipient?.name || '').trim(),
      email: String(recipient?.email || '').trim().toLowerCase(),
    }))
    .map((recipient) => ({
      ...recipient,
      name: recipient.name || recipient.email.split('@')[0],
    }))
    .filter((recipient) => {
      if (!recipient.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email) || seen.has(recipient.email)) {
        return false
      }
      seen.add(recipient.email)
      return true
    })
}

async function sendEmailCampaign(req, res, next) {
  try {
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '').trim()
    const recipients = normalizeRecipients(req.body?.recipients)

    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and email body are required.' })
    }

    if (!recipients.length) {
      return res.status(400).json({ message: 'At least one valid customer email is required.' })
    }

    if (recipients.length > 500) {
      return res.status(400).json({ message: 'Maximum 500 recipients allowed per campaign.' })
    }

    let campaign = await EmailCampaign.create({
      name: String(req.body?.name || 'Email Campaign').trim(),
      subject,
      body,
      recipients,
      status: 'Ready',
      folder: 'ready',
      createdBy: req.user._id,
    })
    let results
    try {
      const trackingBaseUrl = process.env.APP_PUBLIC_URL || `${req.protocol}://${req.get('host')}`
      results = await sendBulkEmail({ subject, body, recipients, trackingBaseUrl, campaignId: campaign._id.toString(), userId: req.user._id })
    } catch (error) {
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        $push: {
          replies: {
            type: 'system',
            body: error.message || 'Email send failed.',
            createdAt: new Date(),
          },
        },
      }).catch(() => {})
      const statusCode = error.statusCode || (/smtp|gmail|login|auth|password|tls|ssl|connect/i.test(error.message || '') ? 400 : 502)
      return res.status(statusCode).json({
        message: error.message || 'Email send failed. SMTP settings check karo.',
      })
    }

    const rejected = results.filter((item) => item.rejected?.length)
    try {
      campaign = await EmailCampaign.findByIdAndUpdate(campaign._id, {
        status: 'Sent',
        folder: 'sent',
        sentAt: new Date(),
        sent: results.length - rejected.length,
        rejected: rejected.length,
        results,
      }, { new: true }).lean()
    } catch (error) {
      console.error('Email sent but campaign save failed:', error.message)
    }

    res.json({
      message: rejected.length
        ? `${results.length - rejected.length} emails sent, ${rejected.length} rejected.`
        : campaign
          ? `${results.length} emails sent successfully.`
          : `${results.length} emails sent successfully, but Sent folder save failed.`,
      sent: results.length - rejected.length,
      rejected: rejected.length,
      results,
      campaign: campaign || {
        id: `email-${Date.now()}`,
        channel: 'email',
        name: String(req.body?.name || 'Email Campaign').trim(),
        subject,
        body,
        recipients,
        status: 'Sent',
        folder: 'sent',
        sentAt: new Date().toISOString(),
        sent: results.length - rejected.length,
        rejected: rejected.length,
      },
    })
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.message || 'Email send failed. SMTP settings check karo.',
    })
  }
}

async function listEmailCampaigns(req, res, next) {
  try {
    const folder = String(req.query.folder || '').trim()
    const query = {
      createdBy: req.user._id,
      ...(folder === 'starred' ? { starred: true } : folder ? { folder } : {}),
    }
    const campaigns = await EmailCampaign.find(query).sort({ updatedAt: -1 }).limit(200).lean()

    res.json({
      campaigns,
      inboxConnected: true,
      inboxMessage: 'Sync Inbox click karke Gmail replies fetch karo. Gmail settings mein IMAP enabled hona chahiye.',
    })
  } catch (error) {
    next(error)
  }
}

async function getEmailTracking(req, res, next) {
  try {
    const campaigns = await EmailCampaign.find({ createdBy: req.user._id, folder: { $in: ['sent', 'inbox', 'scheduled'] } })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()
    const sentCampaigns = campaigns.filter((campaign) => campaign.folder === 'sent')
    const totalSent = sentCampaigns.reduce((sum, campaign) => sum + (campaign.sent || campaign.recipients?.length || 0), 0)
    const totalOpens = sentCampaigns.reduce((sum, campaign) => sum + (campaign.openCount || 0), 0)
    const totalReplies = campaigns.reduce((sum, campaign) => sum + (campaign.replies?.filter((reply) => reply.type !== 'system').length || 0), 0)

    res.json({
      campaigns,
      summary: {
        totalCampaigns: sentCampaigns.length,
        totalSent,
        totalOpens,
        totalReplies,
        openRate: totalSent ? Math.round((totalOpens / totalSent) * 100) : 0,
      },
      typingAvailable: false,
      typingMessage: 'Gmail/Outlook recipient typing status share nahi karte. Customer reply bhejega to Sync Inbox ke baad same thread mein reply dikhega.',
    })
  } catch (error) {
    next(error)
  }
}

async function trackEmailOpen(req, res, next) {
  try {
    const pixel = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64')
    const recipientEmail = String(req.query.email || '').toLowerCase()

    await EmailCampaign.findByIdAndUpdate(req.params.campaignId, {
      $inc: { openCount: 1 },
      $set: { lastOpenedAt: new Date() },
      $push: {
        opens: {
          recipientEmail,
          openedAt: new Date(),
          userAgent: req.headers['user-agent'] || '',
          ip: req.ip,
        },
      },
    }).catch(() => {})

    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    })
    res.end(pixel)
  } catch (error) {
    next(error)
  }
}

async function getEmailSmtpStatus(req, res, next) {
  try {
    res.json(await getSmtpStatus({ userId: req.user._id }))
  } catch (error) {
    next(error)
  }
}

async function syncEmailInbox(req, res, next) {
  try {
    const syncedCampaigns = await syncGmailInbox({ userId: req.user._id, limit: Number(req.body?.limit || 20) })
    const campaigns = await EmailCampaign.find({ createdBy: req.user._id, folder: 'inbox' }).sort({ updatedAt: -1 }).limit(200).lean()

    res.json({
      message: `${syncedCampaigns.length} inbox email/replies synced.`,
      synced: syncedCampaigns.length,
      campaigns,
    })
  } catch (error) {
    const statusCode = error.statusCode || (/auth|password|login|imap|gmail/i.test(error.message || '') ? 400 : 502)
    res.status(statusCode).json({
      message: error.message || 'Inbox sync failed. Gmail IMAP settings check karo.',
    })
  }
}

async function saveEmailCampaign(req, res, next) {
  try {
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '').trim()
    const recipients = normalizeRecipients(req.body?.recipients)
    const status = req.body?.status === 'Ready' ? 'Ready' : 'Draft'
    const folder = status.toLowerCase()

    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and email body are required.' })
    }

    const campaign = await EmailCampaign.create({
      name: String(req.body?.name || 'Email Campaign').trim(),
      subject,
      body,
      recipients,
      status,
      folder,
      createdBy: req.user._id,
    })

    res.json({ message: `Email campaign ${status.toLowerCase()} saved.`, campaign })
  } catch (error) {
    next(error)
  }
}

async function scheduleEmailCampaign(req, res, next) {
  try {
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '').trim()
    const recipients = normalizeRecipients(req.body?.recipients)
    const scheduledAt = new Date(req.body?.scheduledAt)

    if (!subject || !body || !recipients.length) {
      return res.status(400).json({ message: 'Subject, body, and recipients are required.' })
    }

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return res.status(400).json({ message: 'Future schedule date and time required.' })
    }

    const campaign = await EmailCampaign.create({
      name: String(req.body?.name || 'Scheduled Email Campaign').trim(),
      subject,
      body,
      recipients,
      status: 'Scheduled',
      folder: 'scheduled',
      scheduledAt,
      createdBy: req.user._id,
    })

    res.json({ message: `Email scheduled for ${scheduledAt.toLocaleString('en-IN')}.`, campaign })
  } catch (error) {
    next(error)
  }
}

async function updateEmailCampaign(req, res, next) {
  try {
    const updates = {}
    if (typeof req.body?.starred === 'boolean') updates.starred = req.body.starred
    if (typeof req.body?.spam === 'boolean') {
      updates.folder = req.body.spam ? 'spam' : 'inbox'
      updates.status = req.body.spam ? 'Spam' : 'Inbox'
    }

    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: req.params.campaignId, createdBy: req.user._id },
      updates,
      { new: true },
    ).lean()
    if (!campaign) {
      return res.status(404).json({ message: 'Email campaign not found.' })
    }

    res.json({ message: 'Email updated.', campaign })
  } catch (error) {
    next(error)
  }
}

module.exports = { getEmailSmtpStatus, getEmailTracking, listEmailCampaigns, saveEmailCampaign, scheduleEmailCampaign, sendEmailCampaign, syncEmailInbox, trackEmailOpen, updateEmailCampaign }
