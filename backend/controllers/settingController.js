const AppSetting = require('../models/AppSetting')

function cleanCloudinaryConfig(config = {}) {
  return {
    cloudName: String(config.cloudName || config.cloud_name || '').trim(),
    apiKey: String(config.apiKey || config.api_key || '').trim(),
    apiSecret: String(config.apiSecret || config.api_secret || '').trim(),
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

module.exports = { getCloudinarySetting, saveCloudinarySetting }
