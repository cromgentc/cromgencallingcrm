const nodemailer = require('nodemailer')
const AppSetting = require('../models/AppSetting')

function smtpSettingKey(userId) {
  return userId ? `emailSmtp:${userId}` : 'emailSmtp'
}

async function loadSmtpSetting(userId) {
  const keys = userId ? [smtpSettingKey(userId), 'emailSmtp'] : ['emailSmtp']
  const settings = await AppSetting.find({ key: { $in: keys } }).lean()
  const byKey = new Map(settings.map((setting) => [setting.key, setting.value || {}]))

  return {
    userSaved: userId ? byKey.get(smtpSettingKey(userId)) || {} : {},
    globalSaved: byKey.get('emailSmtp') || {},
  }
}

async function smtpConfig({ userId } = {}) {
  const { userSaved, globalSaved } = await loadSmtpSetting(userId)
  const saved = { ...globalSaved, ...userSaved }
  const password = String(userSaved.password || process.env.SMTP_PASS || globalSaved.password || '').replace(/\s/g, '')

  return {
    host: userSaved.host || process.env.SMTP_HOST || saved.host || '',
    port: Number(userSaved.port || process.env.SMTP_PORT || saved.port || 587),
    secure: String(userSaved.secure ?? process.env.SMTP_SECURE ?? saved.secure ?? 'false').toLowerCase() === 'true',
    auth: {
      user: userSaved.username || process.env.SMTP_USER || saved.username || '',
      pass: password,
    },
    fromEmail: userSaved.fromEmail || process.env.SMTP_FROM_EMAIL || saved.fromEmail || userSaved.username || process.env.SMTP_USER || saved.username || '',
    fromName: userSaved.fromName || process.env.SMTP_FROM_NAME || saved.fromName || 'CromGen CRM',
  }
}

async function getSmtpStatus({ userId } = {}) {
  const { userSaved, globalSaved } = await loadSmtpSetting(userId)
  const config = await smtpConfig({ userId })

  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.auth.user,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    passwordSet: Boolean(config.auth.pass),
    source: {
      host: userSaved.host ? 'user-settings' : process.env.SMTP_HOST ? '.env' : globalSaved.host ? 'global-settings' : 'missing',
      username: userSaved.username ? 'user-settings' : process.env.SMTP_USER ? '.env' : globalSaved.username ? 'global-settings' : 'missing',
      password: userSaved.password ? 'user-settings' : process.env.SMTP_PASS ? '.env' : globalSaved.password ? 'global-settings' : 'missing',
      fromEmail: userSaved.fromEmail ? 'user-settings' : process.env.SMTP_FROM_EMAIL ? '.env' : globalSaved.fromEmail ? 'global-settings' : 'missing',
    },
  }
}

function normalizeSmtpError(error) {
  const code = error?.code || ''
  const command = error?.command ? ` (${error.command})` : ''
  const response = error?.response || error?.message || 'SMTP send failed.'
  const message = String(response)

  if (code === 'EAUTH' || /Invalid login|Username and Password not accepted|Application-specific password required|InvalidSecondFactor|534|535/i.test(message)) {
    const authError = new Error('Gmail SMTP login failed: Application-specific password required. SMTP_PASS mein normal/custom password nahi chalega. Google Account > Security > 2-Step Verification > App passwords se generated 16-character App Password paste karo.')
    authError.statusCode = 400
    return authError
  }

  if (/self signed|certificate|TLS|SSL/i.test(message)) {
    const tlsError = new Error('SMTP TLS/SSL error. Gmail ke liye Port 587 aur Secure false rakho. Port 465 use karoge to Secure true rakho.')
    tlsError.statusCode = 400
    return tlsError
  }

  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    const connectionError = new Error(`SMTP server connect nahi ho pa raha${command}. Host/port check karo: Gmail ke liye smtp.gmail.com, port 587, secure false.`)
    connectionError.statusCode = 502
    return connectionError
  }

  const smtpError = new Error(`SMTP error${command}: ${message}`)
  smtpError.statusCode = error?.statusCode || 400
  return smtpError
}

function assertSmtpConfigured(config) {
  const missing = []
  if (!config.host) missing.push('SMTP_HOST')
  if (!config.auth.user) missing.push('SMTP_USER')
  if (!config.auth.pass) missing.push('SMTP_PASS')
  if (!config.fromEmail) missing.push('SMTP_FROM_EMAIL')

  if (missing.length) {
    const error = new Error(`SMTP settings missing: ${missing.join(', ')}. Settings > Email SMTP Gateway mein Gmail SMTP save karo, ya backend .env mein SMTP_* values add karke server restart karo.`)
    error.statusCode = 400
    throw error
  }

  const isGmail = /(^|\.)gmail\.com$/i.test(config.host) || /gmail\.com$/i.test(config.auth.user)
  const compactPassword = String(config.auth.pass || '').replace(/\s/g, '')
  const looksLikeNormalPassword = /[^a-zA-Z0-9]/.test(compactPassword) || compactPassword.length < 16

  if (isGmail && looksLikeNormalPassword) {
    const error = new Error('Gmail SMTP ke liye normal Gmail password nahi chalega. Google Account > Security > 2-Step Verification > App passwords se 16-character App Password banao, phir SMTP_PASS/Settings password mein wahi save karo.')
    error.statusCode = 400
    throw error
  }
}

function createTransporter(config) {
  assertSmtpConfigured(config)

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })
}

function renderTemplate(value = '', recipient = {}) {
  return String(value)
    .replaceAll('{{name}}', recipient.name || '')
    .replaceAll('{{email}}', recipient.email || '')
}

function htmlFromText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

async function sendBulkEmail({ subject, body, recipients, trackingBaseUrl = '', campaignId = '', userId = '' }) {
  try {
    const config = await smtpConfig({ userId })
    const transporter = createTransporter(config)
    const from = `"${config.fromName.replace(/"/g, '')}" <${config.fromEmail}>`
    const results = []

    await transporter.verify()

    for (const recipient of recipients) {
      const trackingUrl = trackingBaseUrl && campaignId
        ? `${trackingBaseUrl.replace(/\/+$/, '')}/api/marketing/email/open/${campaignId}?email=${encodeURIComponent(recipient.email)}`
        : ''
      const renderedBody = renderTemplate(body, recipient)
      const html = `${htmlFromText(renderedBody)}${trackingUrl ? `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;opacity:0;width:1px;height:1px" />` : ''}`
      const info = await transporter.sendMail({
        from,
        to: `"${String(recipient.name || '').replace(/"/g, '')}" <${recipient.email}>`,
        subject: renderTemplate(subject, recipient),
        text: renderedBody,
        html,
      })

      results.push({
        email: recipient.email,
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
      })
    }

    return results
  } catch (error) {
    throw normalizeSmtpError(error)
  }
}

module.exports = { assertSmtpConfigured, getSmtpStatus, normalizeSmtpError, sendBulkEmail, smtpSettingKey }
