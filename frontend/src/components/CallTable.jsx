import { useMemo, useState } from 'react'
import { CheckCircle2, Download, Edit3, Headphones, Save, Trash2, X } from 'lucide-react'
import { deleteCall, deleteCalls, downloadCallRecording, updateCall } from '../controllers/callController'

const sentimentClasses = {
  Interested: 'bg-emerald-50 text-emerald-700',
  Neutral: 'bg-slate-100 text-slate-700',
  'Hot Lead': 'bg-rose-50 text-rose-700',
  'Not Interested': 'bg-slate-100 text-slate-700',
  'No Response': 'bg-amber-50 text-amber-700',
  'Call Disconnected': 'bg-orange-50 text-orange-700',
  Callback: 'bg-sky-50 text-sky-700',
  'Call Handling': 'bg-violet-50 text-violet-700',
}

const tags = ['Interested', 'Hot Lead', 'Not Interested', 'No Response', 'Call Disconnected', 'Callback', 'Call Handling', 'Neutral']

function isSavedCall(call) {
  return Boolean(call.completedAt) || call.stage === 'Completed'
}

function statusLabel(call) {
  if (isSavedCall(call)) {
    return 'Tagged'
  }

  if (['Dialing', 'Outcall', 'On Call'].includes(call.stage)) {
    return 'Live Call'
  }

  return call.stage || 'End Call'
}

export default function CallTable({
  calls,
  currentUser,
  canDownloadRecordings = false,
  enableTagging = true,
  onCallDeleted,
  onCallsDeleted,
  onCallUpdated,
}) {
  const [downloadError, setDownloadError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [editingCallId, setEditingCallId] = useState('')
  const [selectedCallIds, setSelectedCallIds] = useState([])

  const isAdmin = currentUser?.role === 'admin'
  const canViewActiveTaggings = !['admin', 'manager'].includes(currentUser?.role)
  const canPlayRecording = ['admin', 'manager', 'teamleader'].includes(currentUser?.role)
  const activeCalls = useMemo(() => calls.filter((call) => !isSavedCall(call)), [calls])
  const savedCalls = useMemo(() => calls.filter(isSavedCall), [calls])

  async function handleTagSave(call) {
    const draft = drafts[call.id] || {}
    const updated = await updateCall(call.id, {
      sentiment: draft.sentiment || call.sentiment || 'Interested',
      remark: draft.remark ?? call.remark ?? '',
      stage: 'Completed',
    })

    setEditingCallId('')
    onCallUpdated?.(updated)
  }

  async function handleDelete(call) {
    if (!window.confirm(`Delete ${call.id}?`)) {
      return
    }

    await deleteCall(call.id)
    onCallDeleted?.(call.id)
    setSelectedCallIds((current) => current.filter((callId) => callId !== call.id))
  }

  async function handleBulkDelete(callIds) {
    const ids = callIds.filter(Boolean)

    if (!ids.length) {
      return
    }

    if (!window.confirm(`Delete ${ids.length} saved tagging${ids.length === 1 ? '' : 's'}?`)) {
      return
    }

    const result = await deleteCalls(ids)
    const deletedIds = result.callIds || ids

    onCallsDeleted?.(deletedIds)
    setSelectedCallIds((current) => current.filter((callId) => !deletedIds.includes(callId)))
  }

  async function handleDownload(call) {
    try {
      setDownloadError('')
      await downloadCallRecording(call)
    } catch (error) {
      setDownloadError(error.message || 'Recording download failed')
    }
  }

  function updateDraft(callId, patch) {
    setDrafts((current) => ({
      ...current,
      [callId]: {
        ...current[callId],
        ...patch,
      },
    }))
  }

  function toggleSelection(callId) {
    setSelectedCallIds((current) => (current.includes(callId) ? current.filter((id) => id !== callId) : [...current, callId]))
  }

  function toggleAllSaved() {
    const allSavedIds = savedCalls.map((call) => call.id)
    setSelectedCallIds((current) => (allSavedIds.every((id) => current.includes(id)) ? [] : allSavedIds))
  }

  return (
    <section className="space-y-4">
      {downloadError ? (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {downloadError}
        </div>
      ) : null}

      {canViewActiveTaggings ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold text-slate-950">Active Taggings</h2>
            <p className="text-sm font-semibold text-slate-500">Only allocated live/end-call records appear here until they are saved.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {activeCalls.map((call) => (
              <article key={call.id} className="min-w-0 p-4">
                <div className="grid min-w-0 gap-3 lg:grid-cols-[1fr_0.8fr_0.7fr_1fr] lg:items-center">
                  <div>
                    <p className="font-bold text-slate-950">{call.customer}</p>
                    <p className="text-sm text-slate-500">{call.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{call.duration || '00:00'}</p>
                    <p className="text-xs text-slate-500">{call.id}</p>
                  </div>
                  <div>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                      {statusLabel(call)}
                    </span>
                  </div>
                  {enableTagging ? (
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        className="h-10 min-w-0 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500"
                        value={drafts[call.id]?.sentiment || call.sentiment || 'Interested'}
                        onChange={(event) => updateDraft(call.id, { sentiment: event.target.value })}
                      >
                        {tags.map((tag) => (
                          <option key={tag}>{tag}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleTagSave(call)} className="flex h-10 items-center justify-center gap-1 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                        <CheckCircle2 size={16} />
                        Save
                      </button>
                    </div>
                  ) : null}
                </div>

                {enableTagging ? (
                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase text-slate-400">Remark</span>
                    <textarea
                      className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-800 outline-none focus:border-teal-500"
                      placeholder="Remark"
                      value={drafts[call.id]?.remark || call.remark || ''}
                      onChange={(event) => updateDraft(call.id, { remark: event.target.value })}
                    />
                  </label>
                ) : null}
              </article>
            ))}

            {!activeCalls.length ? (
              <EmptyState title="No active taggings" description="Allocated live/end-call records will appear here until they are saved." />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-950">Saved Tagging Details</h2>
            <p className="text-sm font-semibold text-slate-500">Saved call outcomes and recordings are listed here.</p>
          </div>
          {isAdmin && savedCalls.length ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleBulkDelete(selectedCallIds)}
                disabled={!selectedCallIds.length}
                className="flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} />
                Delete Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkDelete(savedCalls.map((call) => call.id))}
                className="flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white"
              >
                <Trash2 size={15} />
                Delete All
              </button>
            </div>
          ) : null}
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {savedCalls.map((call) => {
            const isEditing = editingCallId === call.id
            const sentiment = drafts[call.id]?.sentiment || call.sentiment || 'Neutral'
            const remark = drafts[call.id]?.remark ?? call.remark ?? ''

            return (
              <article key={call.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-bold text-slate-950">{call.customer}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">{call.phone}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{call.id} - {call.duration || '00:00'}</p>
                  </div>
                  {isAdmin ? (
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-slate-300 text-teal-600"
                      checked={selectedCallIds.includes(call.id)}
                      onChange={() => toggleSelection(call.id)}
                      aria-label={`Select ${call.id}`}
                    />
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3">
                  {isEditing && isAdmin ? (
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500"
                      value={sentiment}
                      onChange={(event) => updateDraft(call.id, { sentiment: event.target.value })}
                    >
                      {tags.map((tag) => (
                        <option key={tag}>{tag}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`w-max rounded-full px-2.5 py-1 text-xs font-bold ${sentimentClasses[call.sentiment] || sentimentClasses.Neutral}`}>
                      {call.sentiment}
                    </span>
                  )}

                  {isEditing && isAdmin ? (
                    <textarea
                      className="min-h-16 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-teal-500"
                      value={remark}
                      onChange={(event) => updateDraft(call.id, { remark: event.target.value })}
                    />
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{call.remark || '-'}</p>
                  )}

                  {call.recordingUrl && canPlayRecording ? (
                    <audio className="h-10 w-full" controls src={call.recordingUrl}>
                      <a href={call.recordingUrl}>Recording</a>
                    </audio>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{call.recordingUrl ? 'Recording hidden' : 'No recording'}</span>
                  )}

                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => handleTagSave(call)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white">
                            <Save size={15} />
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingCallId('')} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700" title="Cancel">
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setEditingCallId(call.id)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">
                          <Edit3 size={15} />
                          Edit
                        </button>
                      )}
                      {call.recordingUrl && canDownloadRecordings ? (
                        <button type="button" onClick={() => handleDownload(call)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700" title="Download">
                          <Download size={15} />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleDelete(call)} className="grid size-9 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                {isAdmin ? (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300 text-teal-600"
                      checked={savedCalls.length > 0 && savedCalls.every((call) => selectedCallIds.includes(call.id))}
                      onChange={toggleAllSaved}
                      aria-label="Select all saved taggings"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remark</th>
                <th className="px-4 py-3">Recording</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedCalls.map((call) => {
                const isEditing = editingCallId === call.id
                const sentiment = drafts[call.id]?.sentiment || call.sentiment || 'Neutral'
                const remark = drafts[call.id]?.remark ?? call.remark ?? ''

                return (
                  <tr key={call.id} className="align-top hover:bg-slate-50">
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-slate-300 text-teal-600"
                          checked={selectedCallIds.includes(call.id)}
                          onChange={() => toggleSelection(call.id)}
                          aria-label={`Select ${call.id}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-bold text-slate-950">{call.customer}</td>
                    <td className="px-4 py-3 text-slate-700">{call.phone}</td>
                    <td className="px-4 py-3 text-slate-700">{call.duration || '00:00'}</td>
                    <td className="px-4 py-3">
                      {isEditing && isAdmin ? (
                        <select
                          className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500"
                          value={sentiment}
                          onChange={(event) => updateDraft(call.id, { sentiment: event.target.value })}
                        >
                          {tags.map((tag) => (
                            <option key={tag}>{tag}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${sentimentClasses[call.sentiment] || sentimentClasses.Neutral}`}>
                          {call.sentiment}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      {isEditing && isAdmin ? (
                        <textarea
                          className="min-h-16 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-teal-500"
                          value={remark}
                          onChange={(event) => updateDraft(call.id, { remark: event.target.value })}
                        />
                      ) : (
                        call.remark || '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {call.recordingUrl && canPlayRecording ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <Headphones className="shrink-0 text-teal-600" size={18} />
                          <audio className="h-9 w-56 min-w-0" controls src={call.recordingUrl}>
                            <a href={call.recordingUrl}>Recording</a>
                          </audio>
                        </div>
                      ) : call.recordingUrl ? (
                        <span className="text-xs font-bold text-slate-400">Hidden</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No recording</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => handleTagSave(call)} className="grid size-9 place-items-center rounded-lg bg-teal-600 text-white" title="Save">
                                <Save size={15} />
                              </button>
                              <button type="button" onClick={() => setEditingCallId('')} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700" title="Cancel">
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setEditingCallId(call.id)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700" title="Edit">
                              <Edit3 size={15} />
                            </button>
                          )}
                          {call.recordingUrl && canDownloadRecordings ? (
                            <button type="button" onClick={() => handleDownload(call)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700" title="Download">
                              <Download size={15} />
                            </button>
                          ) : null}
                          <button type="button" onClick={() => handleDelete(call)} className="grid size-9 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">View only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!savedCalls.length ? (
            <EmptyState title="No saved taggings" description="After a tag is saved, its details will move into this table." />
          ) : null}
        </div>
      </section>
    </section>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="p-5">
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <Headphones size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
