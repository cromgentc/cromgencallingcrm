const LeadBucket = require('../models/LeadBucket')
const User = require('../models/User')

function mapLead(lead) {
  return {
    id: lead._id,
    name: lead.name,
    leadName: lead.leadName || lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    positionRole: lead.positionRole,
    interviewDateTime: lead.interviewDateTime,
    candidateId: lead.candidateId,
    qualification: lead.qualification,
    skills: lead.skills,
    resumeUrl: lead.resumeUrl,
    experience: lead.experience,
    leadSource: lead.leadSource,
    leadOwner: lead.leadOwner,
    status: lead.status,
    industry: lead.industry,
    city: lead.city,
    count: lead.count,
    progress: lead.progress,
    createdBy: lead.createdBy,
    createdAt: lead.createdAt,
  }
}

async function getLeads(req, res, next) {
  try {
    let query = { createdBy: req.user._id }

    if (req.user.role === 'admin') {
      query = {}
    } else if (['manager', 'teamleader'].includes(req.user.role)) {
      const staffQuery =
        req.user.role === 'manager'
          ? { role: 'staff', assignedManager: req.user._id }
          : { role: 'staff', assignedTeamLeader: req.user._id }
      const staff = await User.find(staffQuery).select('_id').lean()
      query = { createdBy: { $in: staff.map((member) => member._id) } }
    }

    const leads = await LeadBucket.find(query).sort({ createdAt: -1 }).lean()
    res.json(leads.map(mapLead))
  } catch (error) {
    next(error)
  }
}

async function createLead(req, res, next) {
  try {
    const { name, leadName, count = 0, progress = 0 } = req.body
    const resolvedName = leadName || name

    if (!resolvedName) {
      return res.status(400).json({ message: 'lead name is required' })
    }

    const lead = await LeadBucket.create({
      ...req.body,
      name: resolvedName,
      leadName: resolvedName,
      leadOwner: req.body.leadOwner || req.user.name || 'Unassigned',
      count,
      progress,
      createdBy: req.user._id,
    })
    res.status(201).json(mapLead(lead))
  } catch (error) {
    next(error)
  }
}

async function updateLead(req, res, next) {
  try {
    let query = { _id: req.params.leadId, createdBy: req.user._id }

    if (req.user.role === 'admin') {
      query = { _id: req.params.leadId }
    } else if (['manager', 'teamleader'].includes(req.user.role)) {
      const staffQuery =
        req.user.role === 'manager'
          ? { role: 'staff', assignedManager: req.user._id }
          : { role: 'staff', assignedTeamLeader: req.user._id }
      const staff = await User.find(staffQuery).select('_id').lean()
      query = { _id: req.params.leadId, createdBy: { $in: staff.map((member) => member._id) } }
    }

    const lead = await LeadBucket.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    }).lean()

    if (!lead) {
      return res.status(404).json({ message: 'lead bucket not found' })
    }

    res.json(mapLead(lead))
  } catch (error) {
    next(error)
  }
}

module.exports = { createLead, getLeads, updateLead }
