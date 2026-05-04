const app = require('../../backend/server')
const { startServer } = require('../../backend/server')

let ready

module.exports = async function handler(req, res) {
  ready ||= startServer({ listen: false, scheduler: false })
  await ready
  req.url = '/api/dashboard'
  return app(req, res)
}
