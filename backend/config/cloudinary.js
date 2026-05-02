const { v2: cloudinary } = require('cloudinary')
const AppSetting = require('../models/AppSetting')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET,
})

function assertCloudinaryConfig() {
  const missing = [
    process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME ? '' : 'CLOUD_NAME',
    process.env.CLOUDINARY_API_KEY || process.env.API_KEY ? '' : 'API_KEY',
    process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET ? '' : 'API_SECRET',
  ].filter(Boolean)

  if (missing.length) {
    throw new Error(`${missing.join(', ')} required in backend/.env or Settings`)
  }
}

function normalizeConfig(config = {}) {
  return {
    cloud_name: config.cloudName || config.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
    api_key: config.apiKey || config.api_key || process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
    api_secret: config.apiSecret || config.api_secret || process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET,
  }
}

async function configureCloudinaryFromSettings() {
  const setting = await AppSetting.findOne({ key: 'cloudinary' }).lean()
  const config = normalizeConfig(setting?.value || {})
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)

  if (missing.length) {
    assertCloudinaryConfig()
    return cloudinary
  }

  cloudinary.config(config)
  return cloudinary
}

module.exports = { cloudinary, assertCloudinaryConfig, configureCloudinaryFromSettings }
