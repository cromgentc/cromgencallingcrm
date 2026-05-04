const AppSetting = require('../models/AppSetting')
const { smtpSettingKey } = require('../services/emailMarketingService')

function cleanCloudinaryConfig(config = {}) {
  return {
    cloudName: String(config.cloudName || config.cloud_name || '').trim(),
    apiKey: String(config.apiKey || config.api_key || '').trim(),
    apiSecret: String(config.apiSecret || config.api_secret || '').trim(),
  }
}

function cleanSmtpConfig(config = {}, existing = {}) {
  return {
    provider: String(config.provider || existing.provider || 'SMTP').trim(),
    host: String(config.host || existing.host || '').trim(),
    port: String(config.port || existing.port || '587').trim(),
    username: String(config.username || existing.username || '').trim(),
    password: String(config.password || existing.password || '').trim(),
    fromEmail: String(config.fromEmail || existing.fromEmail || config.username || existing.username || '').trim(),
    fromName: String(config.fromName || existing.fromName || 'CromGen CRM').trim(),
    secure: String(config.secure ?? existing.secure ?? 'false').trim(),
  }
}

async function getCloudinarySetting(req, res, next) {
  try {
    const setting = await AppSetting.findOne({ key: 'cloudinary' }).lean()
    const config = cleanCloudinaryConfig(setting?.value || {})

    res.json({
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecretSet: Boolean(config.apiSecret),
    })
  } catch (error) {
    next(error)
  }
}

async function saveCloudinarySetting(req, res, next) {
  try {
    const config = cleanCloudinaryConfig(req.body || {})

    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      return res.status(400).json({ message: 'CLOUD_NAME, API_KEY, and API_SECRET are required' })
    }

    await AppSetting.findOneAndUpdate(
      { key: 'cloudinary' },
      { value: config, updatedBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    res.json({
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecretSet: true,
      message: 'Cloudinary settings saved',
    })
  } catch (error) {
    next(error)
  }
}

async function getSmtpSetting(req, res, next) {
  try {
    const setting = await AppSetting.findOne({ key: smtpSettingKey(req.user._id) }).lean()
    const config = cleanSmtpConfig(setting?.value || {})

    res.json({
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      secure: config.secure,
      passwordSet: Boolean(config.password),
      owner: {
        id: req.user._id,
        role: req.user.role,
        name: req.user.name,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function saveSmtpSetting(req, res, next) {
  try {
    const key = smtpSettingKey(req.user._id)
    const existingSetting = await AppSetting.findOne({ key }).lean()
    const config = cleanSmtpConfig(req.body || {}, existingSetting?.value || {})

    if (!config.host || !config.port || !config.username || !config.password || !config.fromEmail) {
      return res.status(400).json({ message: 'Host, port, username, password, and from email are required.' })
    }

    await AppSetting.findOneAndUpdate(
      { key },
      { value: config, updatedBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    res.json({
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      secure: config.secure,
      passwordSet: true,
      owner: {
        id: req.user._id,
        role: req.user.role,
        name: req.user.name,
      },
      message: 'Your SMTP settings saved',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { getCloudinarySetting, getSmtpSetting, saveCloudinarySetting, saveSmtpSetting }
