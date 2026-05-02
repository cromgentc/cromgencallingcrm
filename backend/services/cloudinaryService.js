const streamifier = require('streamifier')
const { cloudinary, configureCloudinaryFromSettings } = require('../config/cloudinary')

async function uploadAudioBuffer(buffer, originalName) {
  await configureCloudinaryFromSettings()

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'calltrack/recordings',
        resource_type: 'video',
        use_filename: true,
        unique_filename: true,
        eager: [{ format: 'mp3', audio_codec: 'mp3' }],
        context: { originalName },
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        const mp3Url = result.eager?.[0]?.secure_url
        resolve({
          ...result,
          secure_url: mp3Url || result.secure_url,
          format: mp3Url ? 'mp3' : result.format,
        })
      },
    )

    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

module.exports = { uploadAudioBuffer }
