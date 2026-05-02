const User = require('../models/User')
const { generateStaffId } = require('../utils/staffId')

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    staffId: user.staffId,
    role: user.role,
    phone: user.phone,
    team: user.team,
    assignedManager: user.assignedManager
      ? {
          id: user.assignedManager._id || user.assignedManager,
          name: user.assignedManager.name,
          email: user.assignedManager.email,
        }
      : null,
    assignedTeamLeader: user.assignedTeamLeader
      ? {
          id: user.assignedTeamLeader._id || user.assignedTeamLeader,
          name: user.assignedTeamLeader.name,
          email: user.assignedTeamLeader.email,
        }
      : null,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }
}

async function getStaff(req, res, next) {
  try {
    let query = { role: { $in: ['manager', 'teamleader', 'staff'] } }

    if (req.user.role === 'manager') {
      query = {
        $or: [
          { role: 'teamleader', assignedManager: req.user._id },
          { role: 'staff', assignedManager: req.user._id },
        ],
      }
    }

    if (req.user.role === 'teamleader') {
      query = {
        $or: [
          ...(req.user.assignedManager ? [{ role: 'manager', _id: req.user.assignedManager }] : []),
          { role: 'staff', assignedTeamLeader: req.user._id },
        ],
      }
    }

    if (req.user.role === 'staff') {
      query = {
        $or: [
          ...(req.user.assignedManager ? [{ role: 'manager', _id: req.user.assignedManager }] : []),
          ...(req.user.assignedTeamLeader ? [{ role: 'teamleader', _id: req.user.assignedTeamLeader }] : []),
        ],
      }
    }

    const users = await User.find(query)
      .populate('assignedManager', 'name email')
      .populate('assignedTeamLeader', 'name email')
      .sort({ createdAt: -1 })
      .lean()

    res.json(users.map(sanitizeUser))
  } catch (error) {
    next(error)
  }
}

async function updateStaff(req, res, next) {
  try {
    const { name, email, password, role, phone, team, assignedManager, assignedTeamLeader, isActive } = req.body
    const target = await User.findById(req.params.staffId).select('+password')

    if (!target) {
      return res.status(404).json({ message: 'Staff account not found' })
    }

    const allowedRoles =
      req.user.role === 'admin' ? ['manager', 'teamleader', 'staff'] : req.user.role === 'manager' ? ['teamleader', 'staff'] : ['staff']

    if (!allowedRoles.includes(target.role) || (role && !allowedRoles.includes(role))) {
      return res.status(403).json({ message: 'You cannot update this account' })
    }

    const nextRole = role || target.role

    if (nextRole !== 'staff' && !email && !target.email) {
      return res.status(400).json({ message: 'email is required for manager and teamleader' })
    }

    if (email) {
      const normalizedEmail = email.toLowerCase()
      const exists = await User.exists({ email: normalizedEmail, _id: { $ne: target._id } })

      if (exists) {
        return res.status(409).json({ message: 'Email already registered' })
      }

      target.email = normalizedEmail
    } else if (role === 'staff') {
      target.email = undefined
    }

    let managerId = assignedManager
    let teamLeaderId = assignedTeamLeader

    if (nextRole === 'teamleader') {
      managerId = req.user.role === 'manager' ? req.user._id : assignedManager || target.assignedManager

      if (!managerId || !(await User.exists({ _id: managerId, role: 'manager' }))) {
        return res.status(400).json({ message: 'A team leader must be assigned under a manager.' })
      }
    }

    if (nextRole === 'staff') {
      teamLeaderId = req.user.role === 'teamleader' ? req.user._id : assignedTeamLeader || target.assignedTeamLeader

      if (!teamLeaderId) {
        return res.status(400).json({ message: 'Calling staff must be assigned under a team leader.' })
      }

      const teamLeader = await User.findOne({ _id: teamLeaderId, role: 'teamleader' }).lean()

      if (!teamLeader) {
        return res.status(400).json({ message: 'Select a valid team leader.' })
      }

      if (req.user.role === 'manager' && String(teamLeader.assignedManager) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Calling staff can only be assigned under your team leader.' })
      }

      managerId = teamLeader.assignedManager || managerId
    }

    if (req.user.role === 'teamleader' && String(target.assignedTeamLeader) !== String(req.user._id) && String(target._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot update this account' })
    }

    if (req.user.role === 'manager' && target.role !== 'manager' && String(target.assignedManager) !== String(req.user._id) && String(target._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot update this account' })
    }

    if (name !== undefined) target.name = name
    if (password) target.password = password
    if (role) target.role = role
    if (target.role === 'staff' && !target.staffId) target.staffId = await generateStaffId()
    if (phone !== undefined) target.phone = phone
    if (team !== undefined) target.team = team
    target.assignedManager = nextRole === 'manager' ? undefined : managerId || undefined
    target.assignedTeamLeader = nextRole === 'staff' ? teamLeaderId || undefined : undefined
    if (isActive !== undefined) target.isActive = Boolean(isActive)

    await target.save()
    await target.populate('assignedManager', 'name email')
    await target.populate('assignedTeamLeader', 'name email')

    res.json(sanitizeUser(target))
  } catch (error) {
    next(error)
  }
}

async function deleteStaff(req, res, next) {
  try {
    const target = await User.findById(req.params.staffId).lean()

    if (!target) {
      return res.status(404).json({ message: 'Staff account not found' })
    }

    const allowedRoles =
      req.user.role === 'admin' ? ['manager', 'teamleader', 'staff'] : req.user.role === 'manager' ? ['teamleader', 'staff'] : ['staff']

    if (!allowedRoles.includes(target.role)) {
      return res.status(403).json({ message: 'You cannot delete this account' })
    }

    if (req.user.role === 'manager' && String(target.assignedManager) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot delete this account' })
    }

    if (req.user.role === 'teamleader' && String(target.assignedTeamLeader) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot delete this account' })
    }

    await User.deleteOne({ _id: target._id })
    res.json({ deleted: 1 })
  } catch (error) {
    next(error)
  }
}

async function bulkDeleteStaff(req, res, next) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : []
    const allowedRoles =
      req.user.role === 'admin' ? ['manager', 'teamleader', 'staff'] : req.user.role === 'manager' ? ['teamleader', 'staff'] : ['staff']
    const query = { _id: { $in: ids }, role: { $in: allowedRoles } }

    if (req.user.role === 'manager') {
      query.assignedManager = req.user._id
    }

    if (req.user.role === 'teamleader') {
      query.assignedTeamLeader = req.user._id
    }

    const result = await User.deleteMany(query)

    res.json({ deleted: result.deletedCount })
  } catch (error) {
    next(error)
  }
}

module.exports = { bulkDeleteStaff, deleteStaff, getStaff, updateStaff }
