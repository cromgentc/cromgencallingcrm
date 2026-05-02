import { useCallback, useEffect, useState } from 'react'
import { Copy, ExternalLink, Link, Send } from 'lucide-react'
import ChatThread from './ChatThread'
import { createDialerSession } from '../controllers/dialerController'
import { getMyMessages, replyMessage } from '../controllers/messageController'

export default function StaffDialerPanel({ currentUser }) {
  const [dialerLink, setDialerLink] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState([])
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleLoadMessages = useCallback(async () => {
    const data = await getMyMessages()
    setMessages(data)
  }, [])

  useEffect(() => {
    if (!isChatOpen || currentUser?.role !== 'staff') {
      return undefined
    }

    const interval = setInterval(() => {
      handleLoadMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [currentUser?.role, handleLoadMessages, isChatOpen])

  if (currentUser?.role !== 'staff') {
    return null
  }

  async function handleGenerateLink() {
    try {
      setError('')
      setMessage('')
      setIsGenerating(true)
      const session = await createDialerSession()
      const link = `${window.location.origin}/dialer/${session.token}`
      setDialerLink(link)
      setMessage('Mobile dialer link is ready.')
    } catch (err) {
      setError(err.message || 'Dialer link could not be generated. Restart the backend and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleReply(item, body) {
    await replyMessage(item.id, body)
    await handleLoadMessages()
    setMessage('Reply sent')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(dialerLink)
    setMessage('Dialer link copied')
  }

  function handleShareOnWhatsApp() {
    if (!dialerLink) return

    const text = `Join CallTrack Dialer: ${dialerLink}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-950">Mobile Dialer Link</h2>
          <p className="text-sm text-slate-500">Generate a link, then copy/share it. Open it on mobile to join calls.</p>
        </div>
        <button type="button" onClick={handleGenerateLink} disabled={isGenerating} className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white disabled:opacity-70 sm:w-auto">
          <Link size={18} />
          {isGenerating ? 'Generating...' : 'Generate Link'}
        </button>
      </div>

      {dialerLink ? (
        <div className="mt-4 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="min-w-0 break-all text-sm font-semibold leading-6 text-slate-800">{dialerLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 sm:flex-none"
            >
              <Copy size={16} />
              Copy
            </button>

            <button
              type="button"
              onClick={handleShareOnWhatsApp}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 sm:flex-none"
            >
              <Send size={16} />
              Share
            </button>

            <a
              href={dialerLink}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white sm:flex-none"
            >
              <ExternalLink size={16} />
              Open
            </a>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">{error}</p> : null}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => {
            if (!isChatOpen) {
              handleLoadMessages()
            }
            setIsChatOpen((current) => !current)
          }}
          className="mb-3 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
        >
          {isChatOpen ? 'Close Chat' : 'Open Chat'}
        </button>
        {isChatOpen ? <ChatThread messages={messages} onReply={handleReply} title="Manager Chat" /> : null}
      </div>
    </section>
  )
}
