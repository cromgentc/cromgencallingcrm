const CustomerQueue = require('../models/CustomerQueue')

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim()
}

function mapCustomer(customer) {
  return {
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    status: customer.status,
    assignedToName: customer.assignedToName,
    assignedCallId: customer.assignedCallId,
    uploadedByRole: customer.uploadedByRole,
    scopeManager: customer.scopeManager,
    scopeTeamLeader: customer.scopeTeamLeader,
  }
}

function uploadScope(req) {
  if (req.user.role === 'manager') {
    return { uploadedByRole: 'manager', scopeManager: req.user._id }
  }

  if (req.user.role === 'teamleader') {
    return { uploadedByRole: 'teamleader', scopeTeamLeader: req.user._id }
  }

  return { uploadedByRole: 'admin' }
}

function customerVisibilityQuery(req) {
  if (req.user.role === 'admin') {
    return {}
  }

  if (req.user.role === 'manager') {
    return { $or: [{ uploadedByRole: 'admin' }, { scopeManager: req.user._id }, { uploadedBy: req.user._id }] }
  }

  if (req.user.role === 'teamleader') {
    return { $or: [{ uploadedByRole: 'admin' }, { scopeTeamLeader: req.user._id }, { uploadedBy: req.user._id }] }
  }

  return { assignedTo: req.user._id }
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim())
}

function parseRows(rows = '') {
  const lines = rows
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines
    .map(parseCsvLine)
    .filter((cells, index) => {
      if (index !== 0) {
        return true
      }

      const first = String(cells[0] || '').toLowerCase()
      const second = String(cells[1] || '').toLowerCase()
      return !(first.includes('name') && (second.includes('phone') || second.includes('number') || second.includes('mobile')))
    })
    .map((cells) => {
      const [name, phone] = cells
      return { name, phone }
    })
}

function googleSheetCsvUrl(inputUrl) {
  const url = String(inputUrl || '').trim()
  const idMatch = url.match(/\/spreadsheets\/d\/([^/]+)/)

  if (!idMatch) {
    return url
  }

  const gidMatch = url.match(/[?&]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`
}

async function getCustomers(req, res, next) {
  try {
    const customers = await CustomerQueue.find(customerVisibilityQuery(req)).sort({ createdAt: -1 }).limit(500).lean()
    res.json(customers.map(mapCustomer))
  } catch (error) {
    next(error)
  }
}

async function createCustomer(req, res, next) {
  try {
    const { name, phone } = req.body
    const normalizedPhone = normalizePhone(phone)

    if (!name || !normalizedPhone) {
      return res.status(400).json({ message: 'customer name and phone are required' })
    }

    const customer = await CustomerQueue.create({
      name,
      phone: normalizedPhone,
      uploadedBy: req.user._id,
      ...uploadScope(req),
    })

    res.status(201).json(mapCustomer(customer))
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This phone number already exists in calling database' })
    }

    next(error)
  }
}

async function bulkCreateCustomers(req, res, next) {
  try {
    const customers = Array.isArray(req.body.customers) ? req.body.customers : parseRows(req.body.rows)
    const docs = customers
      .map((customer) => ({
        name: String(customer.name || '').trim(),
        phone: normalizePhone(customer.phone),
        uploadedBy: req.user._id,
        ...uploadScope(req),
      }))
      .filter((customer) => customer.name && customer.phone)

    if (!docs.length) {
      return res.status(400).json({ message: 'Upload at least one valid customer as name,phone' })
    }

    const result = await CustomerQueue.insertMany(docs, { ordered: false }).catch((error) => {
      if (error.insertedDocs) {
        return error.insertedDocs
      }

      throw error
    })

    const inserted = Array.isArray(result) ? result : []
    res.status(201).json({
      inserted: inserted.length,
      skipped: docs.length - inserted.length,
      customers: inserted.map(mapCustomer),
    })
  } catch (error) {
    next(error)
  }
}

async function importCustomersFromUrl(req, res, next) {
  try {
    const { url } = req.body || {}

    if (!url) {
      return res.status(400).json({ message: 'Google Sheet or CSV URL is required' })
    }

    const response = await fetch(googleSheetCsvUrl(url))

    if (!response.ok) {
      return res.status(400).json({ message: 'Sheet fetch failed. Make the Google Sheet public or publish it as CSV.' })
    }

    req.body.rows = await response.text()
    return bulkCreateCustomers(req, res, next)
  } catch (error) {
    next(error)
  }
}

module.exports = { bulkCreateCustomers, createCustomer, getCustomers, importCustomersFromUrl }
