const app = require('../backend/server')
const { startServer } = require('../backend/server')

let ready

module.exports = async function handler(req, res) {
  ready ||= startServer({ listen: false, scheduler: false })
  await ready
  return app(req, res)
}
