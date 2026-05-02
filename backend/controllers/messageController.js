const StaffMessage = require('../models/StaffMessage')
const User = require('../models/User')

function mapMessage(message, viewerId) {
  return {
    id: message._id,
    from: message.from,
    fromName: message.fromName,
    to: message.to,
    body: message.body,
    fromMe: viewerId ? String(message.from) === String(viewerId) : false,
    readAt: message.readAt,
    createdAt: message.createdAt,
  }
}

async function getMyMessages(req, res, next) {
  try {
    const messages = await StaffMessage.find({ $or: [{ to: req.user._id }, { from: req.user._id }] })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()
    res.json(messages.map((message) => mapMessage(message, req.user._id)))
  } catch (error) {
    next(error)
  }
}

async function createMessage(req, res, next) {
  try {
    const { staffId, body } = req.body || {}

    if (!staffId || !body) {
      return res.status(400).json({ message: 'staffId and message are required' })
    }

    const staff = await User.findOne({ staffId: staffId.toUpperCase(), role: 'staff' }).lean()

    if (!staff) {
      return res.status(404).json({ message: 'calling staff not found' })
    }

    const message = await StaffMessage.create({
      from: req.user._id,
      fromName: req.user.name,
      to: staff._id,
      body,
    })

    res.status(201).json(mapMessage(message, req.user._id))
  } catch (error) {
    next(error)
  }
}

async function replyMessage(req, res, next) {
  try {
    const { body } = req.body || {}

    if (!body) {
      return res.status(400).json({ message: 'message is required' })
    }

    const original = await StaffMessage.findById(req.params.messageId).lean()

    if (!original) {
      return res.status(404).json({ message: 'message not found' })
    }

    if (String(original.to) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can reply only to your messages' })
    }

    const reply = await StaffMessage.create({
      from: req.user._id,
      fromName: req.user.name,
      to: original.from,
      body,
    })

    res.status(201).json(mapMessage(reply, req.user._id))
  } catch (error) {
    next(error)
  }
}

module.exports = { createMessage, getMyMessages, mapMessage, replyMessage }
