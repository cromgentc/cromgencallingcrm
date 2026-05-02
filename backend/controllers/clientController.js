const Client = require('../models/Client')

function mapClient(client) {
  return {
    id: client._id,
    title: client.title,
    companyName: client.companyName,
    companyGst: client.companyGst,
    companyLicenseNumber: client.companyLicenseNumber,
    openingPositionCount: client.openingPositionCount,
    openingPositionName: client.openingPositionName,
    contactPerson: client.contactPerson,
    contactPersonNumber: client.contactPersonNumber,
    status: client.status,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }
}

async function getClients(req, res, next) {
  try {
    const clients = await Client.find().sort({ createdAt: -1 }).lean()
    res.json(clients.map(mapClient))
  } catch (error) {
    next(error)
  }
}

async function createClient(req, res, next) {
  try {
    const { companyName } = req.body || {}

    if (!companyName) {
      return res.status(400).json({ message: 'company name is required' })
    }

    const client = await Client.create({ ...req.body, createdBy: req.user._id })
    res.status(201).json(mapClient(client))
  } catch (error) {
    next(error)
  }
}

async function updateClient(req, res, next) {
  try {
    const client = await Client.findByIdAndUpdate(req.params.clientId, req.body, {
      new: true,
      runValidators: true,
    }).lean()

    if (!client) {
      return res.status(404).json({ message: 'client not found' })
    }

    res.json(mapClient(client))
  } catch (error) {
    next(error)
  }
}

async function deleteClient(req, res, next) {
  try {
    const result = await Client.deleteOne({ _id: req.params.clientId })
    res.json({ deleted: result.deletedCount })
  } catch (error) {
    next(error)
  }
}

module.exports = { createClient, deleteClient, getClients, updateClient }
