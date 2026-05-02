import { useState } from 'react'
import { Database as DatabaseIcon, FileSpreadsheet, Link, PhoneCall, Upload } from 'lucide-react'
import { bulkCreateCustomers, createCustomer, importCustomersFromUrl } from '../controllers/customerController'

const emptyForm = { name: '', phone: '' }

export default function Database({ canManage, onCustomerUploaded }) {
  const [form, setForm] = useState(emptyForm)
  const [bulkRows, setBulkRows] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    try {
      event.preventDefault()
      setMessage('')
      setError('')
      const created = await createCustomer(form)
      onCustomerUploaded?.(created)
      setForm(emptyForm)
      setMessage('Customer added to calling database')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleBulkUpload(event) {
    try {
      event.preventDefault()
      setMessage('')
      setError('')
      const result = await bulkCreateCustomers(bulkRows)
      onCustomerUploaded?.(result)
      setBulkRows('')
      setMessage(`${result.inserted} customers uploaded${result.skipped ? `, ${result.skipped} duplicate skipped` : ''}`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleFileUpload(event) {
    try {
      const file = event.target.files?.[0]

      if (!file) {
        return
      }

      setMessage('')
      setError('')

      if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
        setError('Save the Excel sheet as CSV before uploading.')
        event.target.value = ''
        return
      }

      const rows = await file.text()
      const result = await bulkCreateCustomers(rows)
      onCustomerUploaded?.(result)
      event.target.value = ''
      setMessage(`${result.inserted} customers uploaded from file${result.skipped ? `, ${result.skipped} duplicate skipped` : ''}`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSheetImport(event) {
    try {
      event.preventDefault()
      setMessage('')
      setError('')
      const result = await importCustomersFromUrl(sheetUrl)
      onCustomerUploaded?.(result)
      setSheetUrl('')
      setMessage(`${result.inserted} customers imported from sheet${result.skipped ? `, ${result.skipped} duplicate skipped` : ''}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!canManage) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Calling Database</h2>
        <p className="mt-1 text-sm text-slate-500">Database add/upload access is available only to admin, manager, and team leader roles.</p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-bold text-slate-950">Calling Database</h2>
          <p className="text-sm text-slate-500">Add or upload customer names and numbers. Staff receives them one by one when Ready.</p>
        </div>
        <DatabaseIcon className="text-teal-600" size={22} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input required placeholder="Customer name" className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required placeholder="Calling number" className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white">
          <PhoneCall size={18} />
          Add
        </button>
      </form>

      <form onSubmit={handleBulkUpload} className="mt-4 grid gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          Use these Excel columns: <span className="font-bold text-slate-900">name, phone</span>. Save the Excel file as <span className="font-bold text-slate-900">CSV</span> before uploading, or paste a public Google Sheet link.
        </div>
        <textarea className="min-h-28 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder={'Paste CSV rows:\nname,phone\nRahul Sharma,9876543210\nPriya Singh,9876500001'} value={bulkRows} onChange={(event) => setBulkRows(event.target.value)} />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-800 sm:w-max">
            <Upload size={18} />
            Upload Pasted Rows
          </button>
          <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-800 sm:w-max">
            <FileSpreadsheet size={18} />
            Upload Excel CSV
            <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </form>

      <form onSubmit={handleSheetImport} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" placeholder="Google Sheet public/share link or CSV URL" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} />
        <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 font-bold text-white">
          <Link size={18} />
          Import Google Sheet
        </button>
      </form>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
    </section>
  )
}
