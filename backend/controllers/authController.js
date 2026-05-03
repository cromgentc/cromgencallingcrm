const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { createUserWithUniqueStaffId } = require('../utils/staffId')

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    staffId: user.staffId,
    role: user.role,
    phone: user.phone,
    team: user.team,
    assignedManager: user.assignedManager,
    assignedTeamLeader: user.assignedTeamLeader,
  }
}

async function login(req, res, next) {
  try {
    const { loginId, password, mode } = req.body

    if (!loginId || !password) {
      return res.status(400).json({ message: 'loginId and password are required' })
    }

    const query =
      mode === 'staff'
        ? { staffId: loginId.toUpperCase(), role: 'staff' }
        : { email: loginId.toLowerCase(), role: { $in: ['admin', 'manager', 'teamleader'] } }

    const user = await User.findOne(query).select('+password')

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid login details' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account disabled' })
    }

    res.json({
      token: signToken(user),
      user: sanitizeUser(user),
    })
  } catch (error) {
    next(error)
  }
}

async function registerAdmin(req, res, next) {
  try {
    const { name, email, password, setupKey } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' })
    }

    if (process.env.ADMIN_SETUP_KEY && setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: 'Invalid admin setup key' })
    }

    const adminExists = await User.exists({ role: 'admin' })

    if (adminExists && !process.env.ADMIN_SETUP_KEY) {
      return res.status(409).json({ message: 'Admin already exists' })
    }

    const userExists = await User.exists({ email: email.toLowerCase() })

    if (userExists) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
    })

    res.status(201).json({
      token: signToken(user),
      user: sanitizeUser(user),
    })
  } catch (error) {
    next(error)
  }
}

async function registerAccount(req, res, next) {
  try {
    const { name, email, password, role = 'staff', phone, team, assignedManager, assignedTeamLeader } = req.body
    const normalizedEmail = email ? email.toLowerCase() : undefined
    const allowedRoles =
      req.user.role === 'admin' ? ['manager', 'teamleader', 'staff'] : req.user.role === 'manager' ? ['teamleader', 'staff'] : ['staff']

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'You cannot create this role' })
    }

    if (!name || !password) {
      return res.status(400).json({ message: 'name and password are required' })
    }

    if (role !== 'staff' && !normalizedEmail) {
      return res.status(400).json({ message: 'email is required for manager and teamleader' })
    }

    if (normalizedEmail && (await User.exists({ email: normalizedEmail }))) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    let managerId
    let teamLeaderId

    if (role === 'teamleader') {
      managerId = req.user.role === 'manager' ? req.user._id : assignedManager

      if (!managerId || !(await User.exists({ _id: managerId, role: 'manager' }))) {
        return res.status(400).json({ message: 'A team leader must be assigned under a manager.' })
      }
    }

    if (role === 'staff') {
      teamLeaderId = req.user.role === 'teamleader' ? req.user._id : assignedTeamLeader

      if (!teamLeaderId) {
        return res.status(400).json({ message: 'Calling staff must be assigned under a team leader.' })
      }

      const teamLeader = await User.findOne({ _id: teamLeaderId, role: 'teamleader' }).lean()

      if (!teamLeader) {
        return res.status(400).json({ message: 'Select a valid team leader.' })
      }

      if (req.user.role === 'manager' && String(teamLeader.assignedManager) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Calling staff can only be added under your team leader.' })
      }

      managerId = teamLeader.assignedManager || assignedManager || undefined
    }

    const userPayload = {
      name,
      email: normalizedEmail,
      password,
      role,
      phone,
      team,
      assignedManager: managerId || undefined,
      assignedTeamLeader: teamLeaderId || undefined,
      createdBy: req.user._id,
    }
    const user = role === 'staff' ? await createUserWithUniqueStaffId(userPayload) : await User.create(userPayload)

    res.status(201).json(sanitizeUser(user))
  } catch (error) {
    next(error)
  }
}

async function getMe(req, res) {
  res.json(sanitizeUser(req.user))
}

async function updateMe(req, res, next) {
  try {
    const { name, email, phone, team } = req.body
    const updates = { name, email: email ? email.toLowerCase() : undefined, phone, team }

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key])

    if (updates.email) {
      const existing = await User.exists({ email: updates.email.toLowerCase(), _id: { $ne: req.user._id } })

      if (existing) {
        return res.status(409).json({ message: 'Email already registered' })
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).lean()

    res.json(sanitizeUser(user))
  } catch (error) {
    next(error)
  }
}

module.exports = { getMe, login, registerAccount, registerAdmin, updateMe }
