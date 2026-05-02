const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me')
    const user = await User.findById(decoded.id).lean()

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    next()
  }
}

module.exports = { allowRoles, protect }
