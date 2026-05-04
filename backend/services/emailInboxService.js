const { ImapFlow } = require('imapflow')
const { simpleParser } = require('mailparser')
const EmailCampaign = require('../models/EmailCampaign')
const AppSetting = require('../models/AppSetting')
const { getSmtpStatus, smtpSettingKey } = require('./emailMarketingService')

function cleanSubject(subject = '') {
  return String(subject)
    .replace(/^(re|fw|fwd):\s*/i, '')
    .trim()
    .toLowerCase()
}

function normalizeAddress(address = {}) {
  return {
    name: String(address.name || '').trim(),
    email: String(address.address || '').trim().toLowerCase(),
  }
}

function plainTextFromMessage(message = '') {
  return String(message)
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n')
    .trim()
    .slice(0, 5000)
}

async function findThreadForReply(reply, userId) {
  const subject = cleanSubject(reply.subject)
  const fromEmail = reply.from.email

  if (!fromEmail) return null

  const sentCampaigns = await EmailCampaign.find({
    folder: 'sent',
    createdBy: userId,
    'recipients.email': fromEmail,
  }).sort({ sentAt: -1, updatedAt: -1 }).limit(20).lean()

  return sentCampaigns.find((campaign) => cleanSubject(campaign.subject) === subject) || sentCampaigns[0] || null
}

async function upsertInboxReply(reply, userId) {
  const thread = await findThreadForReply(reply, userId)
  const existing = await EmailCampaign.findOne({ createdBy: userId, 'replies.messageId': reply.messageId }).lean()

  if (existing) {
    return { campaign: existing, created: false }
  }

  if (thread) {
    const updated = await EmailCampaign.findByIdAndUpdate(
      thread._id,
      {
        $push: { replies: reply },
        $set: { folder: 'inbox', status: 'Inbox' },
      },
      { new: true },
    ).lean()

    return { campaign: updated, created: false }
  }

  const campaign = await EmailCampaign.create({
    name: reply.from.name || reply.from.email || 'Incoming Email',
    subject: reply.subject || 'Incoming Email',
    body: reply.body || '',
    recipients: [{ name: reply.from.name || reply.from.email, email: reply.from.email }],
    status: 'Inbox',
    folder: 'inbox',
    replies: [reply],
    createdBy: userId,
  })

  return { campaign, created: true }
}

async function syncGmailInbox({ userId, limit = 20 } = {}) {
  const smtp = await getSmtpStatus({ userId })
  const setting = await AppSetting.findOne({ key: smtpSettingKey(userId) }).lean()
  const saved = setting?.value || {}
  const password = String(saved.password || process.env.SMTP_PASS || '').replace(/\s/g, '')

  if (!smtp.username || !password) {
    const error = new Error('Gmail inbox sync ke liye SMTP_USER and SMTP_PASS/App Password required hai.')
    error.statusCode = 400
    throw error
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: smtp.username,
      pass: password,
    },
    logger: false,
  })

  const synced = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const messages = client.fetch({ seen: false }, {
        envelope: true,
        source: true,
      })

      for await (const message of messages) {
        if (synced.length >= limit) break

        const parsed = await simpleParser(message.source)
        const envelope = message.envelope || {}
        const from = normalizeAddress(parsed.from?.value?.[0] || envelope.from?.[0] || {})
        const reply = {
          messageId: parsed.messageId || envelope.messageId || `imap-${message.uid}`,
          uid: message.uid,
          from,
          subject: parsed.subject || envelope.subject || '',
          body: plainTextFromMessage(parsed.text || ''),
          receivedAt: parsed.date || envelope.date || new Date(),
          syncedAt: new Date(),
        }

        if (!reply.from.email) continue

        const saved = await upsertInboxReply(reply, userId)
        synced.push(saved.campaign)
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return synced
}

module.exports = { syncGmailInbox }
