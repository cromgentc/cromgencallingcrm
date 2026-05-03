import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Headphones, Lock, LogOut, Phone, PhoneCall, Power, UserCheck } from 'lucide-react'
import ChatThread from '../components/ChatThread'
import { authorizeDialer, completeDialerCall, connectDialerCall, createDialerOutcall, getDialerMessages, getNextDialerCall, replyDialerMessage, updateDialerStatus, uploadDialerRecording } from '../controllers/dialerController'

const callTags = ['Interested', 'Hot Lead', 'Not Interested', 'No Response', 'Call Disconnected', 'Callback', 'Call Handling']
const nativeCallRecordingNote = 'Mobile browser direct phone-call conversation audio capture nahi kar sakta. Customer voice record karni ho to call Speaker ON par rakho; earpiece/Bluetooth par customer voice record nahi hogi.'

export default function MobileDialer({ token }) {
  const [auth, setAuth] = useState({ staffId: '', password: '' })
  const storageKey = `calltrack_dialer_${token}`
  const savedDialer = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch {
      return null
    }
  }, [storageKey])
  const [staff, setStaff] = useState(savedDialer?.staff || null)
  const [session, setSession] = useState(savedDialer?.session || null)
  const [currentCall, setCurrentCall] = useState(null)
  const [tagForm, setTagForm] = useState({ sentiment: 'Interested' })
  const [outcall, setOutcall] = useState({ customer: '', phone: '' })
  const [showOutcallForm, setShowOutcallForm] = useState(false)
  const [nextCountdown, setNextCountdown] = useState(0)
  const [uploadingRecording, setUploadingRecording] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [message, setMessage] = useState('')
  const [staffMessages, setStaffMessages] = useState([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [error, setError] = useState('')
  const nextTimerRef = useRef(null)
  const recorderRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingCallRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const recordingStopResolveRef = useRef(null)
  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), [])

  useEffect(() => {
    return () => {
      clearTimeout(nextTimerRef.current)
      stopAutoRecording()
    }
  }, [])

  useEffect(() => {
    if (staff && session) {
      localStorage.setItem(storageKey, JSON.stringify({ staff, session }))
    }
  }, [session, staff, storageKey])

  const handleLoadMessages = useCallback(async () => {
    try {
      const data = await getDialerMessages(token)
      setStaffMessages(data)
    } catch {
      setError('Messages could not be loaded.')
    }
  }, [token])

  function bestRecordingMimeType() {
    const candidates = ['audio/mpeg', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || ''
  }

  async function uploadRecordedBlob(blob, callId, mimeType) {
    if (!blob?.size || !callId) {
      return
    }

    const extension = mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('mp4') ? 'm4a' : 'webm'
    const file = new File([blob], `${callId}-recording.${extension}`, { type: mimeType || blob.type || 'audio/webm' })
    setUploadingRecording(true)
    const response = await uploadDialerRecording(token, callId, file)
    setRecordingUrl(response.recordingUrl)
    setMessage('Recording upload ho gayi. Playback admin panel mein milega.')
    setUploadingRecording(false)
  }

  async function startAutoRecording(call) {
    try {
      if (!call || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setMessage('Call open ho gaya, lekin is device/browser par automatic recording support nahi hai.')
        return
      }

      stopAutoRecording()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      })
      const mimeType = bestRecordingMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      recordingChunksRef.current = []
      recordingCallRef.current = call.id
      recordingStreamRef.current = stream
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const chunks = recordingChunksRef.current
        const callId = recordingCallRef.current
        const type = recorder.mimeType || mimeType || 'audio/webm'
        recordingChunksRef.current = []
        recordingCallRef.current = null
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null

        uploadRecordedBlob(new Blob(chunks, { type }), callId, type)
          .catch((err) => {
            setUploadingRecording(false)
            setError(err.message || 'Recording upload failed.')
          })
          .finally(() => {
            recordingStopResolveRef.current?.()
            recordingStopResolveRef.current = null
          })
      }

      recorder.start(1000)
      setIsRecording(true)
      setMessage(`Recording start ho gayi. ${nativeCallRecordingNote}`)
    } catch {
      setMessage('Recording ke liye microphone permission required hai.')
    }
  }

  function stopAutoRecording({ waitForUpload = false } = {}) {
    const recorder = recorderRef.current
    recorderRef.current = null
    setIsRecording(false)

    if (!recorder) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
      return Promise.resolve()
    }

    const stopped = new Promise((resolve) => {
      recordingStopResolveRef.current = resolve
    })

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
      recordingStopResolveRef.current?.()
      recordingStopResolveRef.current = null
    }

    return waitForUpload ? stopped : Promise.resolve()
  }

  async function connectRecordAndOpenDialer(call, { openDialer = true } = {}) {
    if (!call?.id) {
      return
    }

    const response = await connectDialerCall(token, call.id)
    setSession(response.session)
    setCurrentCall(response.call)
    await startAutoRecording(response.call)

    if (openDialer && response.call?.phone) {
      window.location.href = `tel:${response.call.phone}`
    }
  }

  async function fetchNextCall() {
    const response = await getNextDialerCall(token)
    setSession(response.session)
    if (!response.call) {
      setCurrentCall(null)
      setNextCountdown(0)
      setMessage(response.message || 'Queue mein abhi koi customer call available nahi hai.')
      return
    }

    setCurrentCall(response.call)
    setTagForm({ sentiment: 'Interested' })
    setRecordingUrl('')
    setNextCountdown(0)
    await connectRecordAndOpenDialer(response.call)
  }

  async function handleAuthorize(event) {
    try {
      event.preventDefault()
      setError('')
      const response = await authorizeDialer(token, auth)

      setStaff(response.staff)
      setSession(response.session)

      localStorage.setItem(storageKey, JSON.stringify({ staff: response.staff, session: response.session }))

      // Auto-start calling flow after authorization
      const readySession = await updateDialerStatus(token, 'ready')
      setSession(readySession)

      setMessage('Authorized. Auto-ready ON hai. Next call assign ho rahi hai...')
      await fetchNextCall()
    } catch (err) {
      setError(err.message || 'Authorization failed.')
    }
  }

  async function handleReady() {
    try {
      setError('')
      const readySession = await updateDialerStatus(token, 'ready')
      setSession(readySession)
      await fetchNextCall()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleNotReady() {
    try {
      setError('')
      const updated = await updateDialerStatus(token, 'not_ready')
      setSession(updated)
      setCurrentCall(null)
      setNextCountdown(0)
      clearTimeout(nextTimerRef.current)
      stopAutoRecording()
      setMessage('Not Ready. Ab new calls assign nahi hongi.')
    } catch (err) {
      setError(err.message || 'Status update failed.')
    }
  }

  async function handleOutcall(event) {
    try {
      event.preventDefault()
      setError('')
      const response = await createDialerOutcall(token, outcall)
      setSession(response.session)
      setCurrentCall(response.call)
      setTagForm({ sentiment: 'Interested' })
      setRecordingUrl('')
      await connectRecordAndOpenDialer(response.call)
    } catch (err) {
      setError(err.message || 'Outcall start nahi ho paya.')
    }
  }

  async function handleStartRecording() {
    try {
      if (!currentCall || isRecording) {
        return
      }

      setError('')
      await connectRecordAndOpenDialer(currentCall, { openDialer: false })
    } catch (err) {
      setError(err.message || 'Recording start nahi ho payi.')
    }
  }

  async function handleCallComplete(event) {
    try {
      event.preventDefault()
      setError('')
      clearTimeout(nextTimerRef.current)
      setMessage(isRecording ? 'Call end hua. Recording upload ho rahi hai...' : 'Call tag save ho raha hai...')
      await stopAutoRecording({ waitForUpload: true })
      const response = await completeDialerCall(token, currentCall.id, tagForm)
      setSession(response.session)
      setCurrentCall(response.call)
      setMessage('Call tag save ho gaya. Next call 5 seconds mein start hogi; stop karne ke liye Not Ready tap karo.')

      let seconds = response.nextDelaySeconds || 5
      setNextCountdown(seconds)

      const tick = () => {
        seconds -= 1
        setNextCountdown(seconds)

        if (seconds <= 0) {
          fetchNextCall().catch((err) => {
            setError(err.message)
            setNextCountdown(0)
          })
          return
        }

        nextTimerRef.current = setTimeout(tick, 1000)
      }

      nextTimerRef.current = setTimeout(tick, 1000)
    } catch (err) {
      setError(err.message || 'Call tag could not be saved.')
    }
  }

  async function handleDialerLogout() {
    clearTimeout(nextTimerRef.current)
    localStorage.removeItem(storageKey)
    setStaff(null)
    setSession(null)
    setCurrentCall(null)
    setNextCountdown(0)
    stopAutoRecording()
    setMessage('Dialer logout ho gaya.')
  }

  useEffect(() => {
    if (!isChatOpen || !staff) {
      return undefined
    }

    const interval = setInterval(() => {
      handleLoadMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [handleLoadMessages, isChatOpen, staff])

  async function handleMessageReply(item, body) {
    await replyDialerMessage(token, item.id, body)
    await handleLoadMessages()
    setMessage('Reply sent ho gaya')
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 sm:py-5">
      <section className="mx-auto min-w-0 max-w-md">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-teal-500">
            <PhoneCall size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">Calling Staff Dialer</h1>
            <p className="text-sm text-slate-300">Mobile ready/outcall console</p>
          </div>
        </div>

        {!isMobile ? (
          <div className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
            Ye dialer mobile ke liye optimized hai. Desktop browser phone call automatic open nahi kar sakta.
          </div>
        ) : null}

        {!staff ? (
          <form onSubmit={handleAuthorize} className="min-w-0 rounded-lg bg-white p-4 text-slate-950">
            <h2 className="font-bold">Authorize Dialer</h2>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Staff ID</span>
              <div className="mt-1 flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3">
                <Headphones size={18} className="text-slate-400" />
                <input required className="min-w-0 w-full outline-none" placeholder="CGOB0001" value={auth.staffId} onChange={(event) => setAuth({ ...auth, staffId: event.target.value })} />
              </div>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="mt-1 flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3">
                <Lock size={18} className="text-slate-400" />
                <input required type="password" className="min-w-0 w-full outline-none" value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} />
              </div>
            </label>
            <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white">
              <UserCheck size={18} />
              Authorize
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <section className="min-w-0 rounded-lg bg-white p-4 text-slate-950">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{staff.staffId}</p>
                  <h2 className="break-words text-xl font-bold">{staff.name}</h2>
                </div>
                <button type="button" onClick={handleDialerLogout} className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700">
                  <LogOut size={18} />
                </button>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">Status: {session?.status?.replace('_', ' ')}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={handleReady} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 font-bold text-white">
                  <Phone size={18} />
                  Ready
                </button>
                <button type="button" onClick={handleNotReady} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 font-bold text-white">
                  <Power size={18} />
                  Not Ready
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowOutcallForm((current) => !current)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 font-bold text-white"
              >
                <PhoneCall size={18} />
                Outcall
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isChatOpen) {
                    handleLoadMessages()
                  }
                  setIsChatOpen((current) => !current)
                }}
                className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700"
              >
                {isChatOpen ? 'Close Chat' : 'Open Chat'}
              </button>
              {isChatOpen ? (
              <div className="mt-3">
                <ChatThread messages={staffMessages} onReply={handleMessageReply} title="Team Chat" />
              </div>
              ) : null}
            </section>

            {currentCall ? (
              <section className="min-w-0 rounded-lg border border-teal-300/30 bg-teal-300/10 p-4">
                <p className="text-sm text-teal-100">Current Call</p>
                <h3 className="mt-1 break-words text-lg font-bold">{currentCall.customer}</h3>
                <button type="button" onClick={() => connectRecordAndOpenDialer(currentCall).catch((err) => setError(err.message || 'Call could not be opened.'))} className="mt-3 flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-center font-bold text-white">
                  <Phone size={18} />
                  <span className="break-all">Call & Recording Start {currentCall.phone}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isRecording || uploadingRecording}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 font-bold text-white disabled:opacity-60"
                >
                  <Headphones size={18} />
                  {isRecording ? 'Recording chal rahi hai...' : 'Start Recording'}
                </button>
                <form onSubmit={handleCallComplete} className="mt-4 space-y-3">
                  <select className="h-11 w-full rounded-lg border border-teal-200/30 bg-white px-3 text-slate-950 outline-none" value={tagForm.sentiment} onChange={(event) => setTagForm({ ...tagForm, sentiment: event.target.value })}>
                    {callTags.map((tag) => <option key={tag}>{tag}</option>)}
                  </select>
                  <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 font-bold text-slate-950">
                    <CheckCircle2 size={18} />
                    End Call & Save Tag
                  </button>
                </form>
                <p className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-sm font-bold text-white">
                  {uploadingRecording ? 'Recording upload ho rahi hai...' : isRecording ? 'Recording active hai. Customer voice ke liye Speaker ON rakho.' : 'Phone dialer open hote hi recording start hogi. Speaker ON rakho.'}
                </p>
                <p className="mt-3 rounded-lg border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-center text-xs font-bold text-amber-100">
                  {nativeCallRecordingNote}
                </p>
                {recordingUrl ? <p className="mt-3 text-center text-xs font-bold text-teal-100">Recording saved. Playback admin panel mein available hai.</p> : null}
                {nextCountdown > 0 ? (
                  <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-bold text-white">
                    Next call {nextCountdown}s mein. Stop karne ke liye Not Ready tap karo.
                  </p>
                ) : null}
              </section>
            ) : null}

            {showOutcallForm ? (
              <form onSubmit={handleOutcall} className="min-w-0 rounded-lg bg-white p-4 text-slate-950">
                <h2 className="font-bold">Manual Outcall</h2>
                <input placeholder="Customer name" className="mt-4 h-11 min-w-0 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={outcall.customer} onChange={(event) => setOutcall({ ...outcall, customer: event.target.value })} />
                <input required placeholder="Phone number" className="mt-3 h-11 min-w-0 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-teal-500" value={outcall.phone} onChange={(event) => setOutcall({ ...outcall, phone: event.target.value })} />
                <button type="submit" className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-bold text-white">
                  <PhoneCall size={18} />
                  Manual Outcall
                </button>
              </form>
            ) : null}
          </div>
        )}

        {message ? <p className="mt-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
      </section>
    </main>
  )
}
