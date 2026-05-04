const app = require('../../backend/server')
const { startServer } = require('../../backend/server')

let ready

module.exports = async function handler(req, res) {
  ready ||= startServer({ listen: false, scheduler: false })
  await ready
  if (!req.url.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`
  }
  return app(req, res)
}
