import { Send } from 'lucide-react'
import { useState } from 'react'

export default function ChatThread({ messages, onReply, title = 'Chat' }) {
  const [reply, setReply] = useState('')
  const replyTarget = [...messages].reverse().find((item) => !item.fromMe) || messages[messages.length - 1]

  async function handleSend() {
    if (!reply.trim() || !replyTarget) {
      return
    }

    await onReply(replyTarget, reply)
    setReply('')
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-[#e7f3ef] p-3">
      <div className="mb-3 rounded-lg bg-white/80 px-3 py-2">
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.map((item) => (
          <div key={item.id} className={`flex ${item.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[86%] px-3 py-2 shadow-sm ${item.fromMe ? 'rounded-lg rounded-tr-none bg-teal-100' : 'rounded-lg rounded-tl-none bg-white'}`}>
                <p className={`text-xs font-bold ${item.fromMe ? 'text-teal-800' : 'text-teal-700'}`}>{item.fromMe ? 'You' : item.fromName}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{item.body}</p>
                {item.createdAt ? <p className="mt-1 text-right text-[11px] font-semibold text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> : null}
            </div>
          </div>
        ))}
        {!messages.length ? <p className="rounded-lg bg-white/80 px-3 py-2 text-sm font-semibold text-slate-500">No messages yet.</p> : null}
      </div>
      {messages.length ? (
        <div className="mt-3 flex items-end gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-full border border-white bg-white px-4 text-sm outline-none focus:border-teal-500"
            placeholder="Reply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
          <button type="button" onClick={handleSend} className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-600 text-white">
            <Send size={17} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
