import { useEffect, useMemo, useState } from 'react'
import { Archive, CheckCircle2, ChevronDown, ListPlus, LogOut, MessageCircle, Plus, RefreshCw, RotateCcw, Search, Send, Smartphone, Star, Users, X } from 'lucide-react'
import { request } from '../controllers/httpController'
import { API_ENDPOINTS } from '../services/api'
import { readUserJson, writeUserJson } from '../utils/userStorage'

const initialStatus = {
  connected: false,
  status: 'not_started',
  number: '',
  name: '',
  qrImage: '',
  lastError: '',
}

const favoriteStorageKey = 'calltrack_whatsapp_favorites'
const listStorageKey = 'calltrack_whatsapp_lists'

function readJson(key, fallback) {
  return readUserJson(key, fallback)
}

function saveJson(key, value) {
  writeUserJson(key, value)
}

function sessionMessage(status, connected, hasQr) {
  if (connected) {
    return 'WhatsApp connected. Chat is open.'
  }

  if (hasQr) {
    return 'QR is ready. Scan it from WhatsApp on your mobile.'
  }

  if (status === 'authenticated') {
    return 'WhatsApp login is complete. Waiting for WhatsApp Web to sync chats.'
  }

  if (status === 'starting') {
    return 'WhatsApp browser is starting. QR or connected status will appear shortly.'
  }

  return 'Session started. WhatsApp status is updating...'
}

export default function WhatsAppView() {
  const [session, setSession] = useState(initialStatus)
  const [message, setMessage] = useState('Click Start WhatsApp Session to generate QR.')
  const [isLoading, setIsLoading] = useState(false)
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState('')
  const [messages, setMessages] = useState([])
  const [chatSearch, setChatSearch] = useState('')
  const [reply, setReply] = useState('')
  const [chatError, setChatError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [favoriteChatIds, setFavoriteChatIds] = useState(() => readJson(favoriteStorageKey, []))
  const [customLists, setCustomLists] = useState(() => readJson(listStorageKey, []))
  const [newListOpen, setNewListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [chatMenuOpen, setChatMenuOpen] = useState(false)

  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId), [chats, selectedChatId])
  const activeCustomList = customLists.find((list) => activeFilter === `list:${list.id}`)
  const filteredChats = chats.filter((chat) => {
    const matchesSearch = `${chat.name} ${chat.lastMessage}`.toLowerCase().includes(chatSearch.toLowerCase())
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'archived' && chat.archived) ||
      (activeFilter === 'unread' && chat.unreadCount > 0) ||
      (activeFilter === 'favorites' && favoriteChatIds.includes(chat.id)) ||
      (activeFilter === 'groups' && chat.isGroup) ||
      (activeCustomList && activeCustomList.chatIds.includes(chat.id))

    return matchesSearch && matchesFilter
  })

  const filterTabs = [
    { id: 'all', label: 'All', count: chats.length },
    { id: 'unread', label: 'Unread', count: chats.filter((chat) => chat.unreadCount > 0).length },
    { id: 'favorites', label: 'Favorites', count: favoriteChatIds.length },
    { id: 'groups', label: 'Groups', count: chats.filter((chat) => chat.isGroup).length },
  ]
  const archivedCount = chats.filter((chat) => chat.archived).length

  async function loadStatus({ quiet = false } = {}) {
    try {
      const data = await request(API_ENDPOINTS.whatsapp.status)
      setSession(data)
      if (!quiet) {
        setMessage(sessionMessage(data.status, data.connected, data.qrImage))
      }
    } catch (error) {
      setMessage(error.message || 'WhatsApp status could not be loaded.')
    }
  }

  async function loadChats() {
    try {
      setChatError('')
      const data = await request(API_ENDPOINTS.whatsapp.chats)
      setChats(data)
      setSelectedChatId((current) => current || data[0]?.id || '')
    } catch (error) {
      setChatError(error.message || 'WhatsApp chats could not be loaded.')
    }
  }

  async function loadMessages(chatId = selectedChatId) {
    if (!chatId) {
      setMessages([])
      return
    }

    try {
      setChatError('')
      const data = await request(API_ENDPOINTS.whatsapp.messages(chatId))
      setMessages(data)
    } catch (error) {
      setChatError(error.message || 'WhatsApp messages could not be loaded.')
    }
  }

  async function startSession() {
    try {
      setIsLoading(true)
      setMessage('Starting WhatsApp session...')
      const data = await request(API_ENDPOINTS.whatsapp.start, { method: 'POST' })
      setSession(data)
      setMessage(sessionMessage(data.status, data.connected, data.qrImage))
      if (data.connected) {
        await loadChats()
      }
    } catch (error) {
      setMessage(error.message || 'WhatsApp session could not be started.')
    } finally {
      setIsLoading(false)
    }
  }

  async function resetSession() {
    try {
      setIsLoading(true)
      const data = await request(API_ENDPOINTS.whatsapp.reset, { method: 'POST' })
      setSession(data)
      setChats([])
      setMessages([])
      setSelectedChatId('')
      setMessage('WhatsApp session has been reset.')
    } catch (error) {
      setMessage(error.message || 'WhatsApp session could not be reset.')
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage() {
    const body = reply.trim()
    if (!body || !selectedChatId) {
      return
    }

    try {
      setReply('')
      const sent = await request(API_ENDPOINTS.whatsapp.sendMessage(selectedChatId), {
        method: 'POST',
        body: JSON.stringify({ message: body }),
      })
      setMessages((current) => [...current, sent])
      loadChats()
    } catch (error) {
      setChatError(error.message || 'Message could not be sent.')
      setReply(body)
    }
  }

  function toggleFavorite(chatId = selectedChatId) {
    if (!chatId) {
      return
    }

    const next = favoriteChatIds.includes(chatId) ? favoriteChatIds.filter((id) => id !== chatId) : [...favoriteChatIds, chatId]
    setFavoriteChatIds(next)
    saveJson(favoriteStorageKey, next)
  }

  function createList() {
    const name = newListName.trim()
    if (!name) {
      return
    }

    const list = {
      id: `${Date.now()}`,
      name,
      chatIds: selectedChatId ? [selectedChatId] : [],
    }
    const next = [...customLists, list]
    setCustomLists(next)
    saveJson(listStorageKey, next)
    setActiveFilter(`list:${list.id}`)
    setNewListName('')
    setNewListOpen(false)
  }

  function toggleChatInList(listId, chatId = selectedChatId) {
    if (!chatId) {
      return
    }

    const next = customLists.map((list) => {
      if (list.id !== listId) {
        return list
      }

      return {
        ...list,
        chatIds: list.chatIds.includes(chatId) ? list.chatIds.filter((id) => id !== chatId) : [...list.chatIds, chatId],
      }
    })
    setCustomLists(next)
    saveJson(listStorageKey, next)
  }

  function deleteList(listId) {
    const next = customLists.filter((list) => list.id !== listId)
    setCustomLists(next)
    saveJson(listStorageKey, next)
    if (activeFilter === `list:${listId}`) {
      setActiveFilter('all')
    }
  }

  useEffect(() => {
    const initialTimer = window.setTimeout(() => loadStatus({ quiet: true }), 0)
    const statusTimer = window.setInterval(() => loadStatus({ quiet: true }), 3000)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(statusTimer)
    }
  }, [])

  useEffect(() => {
    loadMessages(selectedChatId)
    setChatMenuOpen(false)
  }, [selectedChatId])

  useEffect(() => {
    if (session.connected && !chats.length) {
      loadChats()
    }
  }, [session.connected, chats.length])

  return (
    <section className="flex h-[calc(100vh-150px)] min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {session.connected ? (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{session.name || 'WhatsApp linked'}</p>
                  <p className="text-sm font-semibold text-emerald-700">{session.number || 'Connected'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={loadChats} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button type="button" onClick={resetSession} disabled={isLoading} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 disabled:opacity-60">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-teal-500 focus:bg-white"
                  placeholder="Search chat"
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'archived' ? 'all' : 'archived')}
                className={`mt-3 flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-bold transition ${
                  activeFilter === 'archived' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Archive size={17} />
                  Archived
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${activeFilter === 'archived' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                  {archivedCount}
                </span>
              </button>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeFilter === tab.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label} {tab.count ? <span className="ml-1 opacity-80">{tab.count}</span> : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNewListOpen((current) => !current)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <ListPlus size={13} />
                  New List
                </button>
              </div>
              {newListOpen ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex gap-2">
                    <input
                      className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
                      placeholder="List name"
                      value={newListName}
                      onChange={(event) => setNewListName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          createList()
                        }
                      }}
                    />
                    <button type="button" onClick={createList} className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-600 text-white">
                      <Plus size={17} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">The selected chat will be added to this list automatically.</p>
                </div>
              ) : null}
              {customLists.length ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {customLists.map((list) => (
                    <span key={list.id} className={`flex shrink-0 items-center rounded-full text-xs font-bold ${activeFilter === `list:${list.id}` ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                      <button type="button" onClick={() => setActiveFilter(`list:${list.id}`)} className="px-3 py-1.5">
                        {list.name} {list.chatIds.length ? <span className="ml-1">{list.chatIds.length}</span> : null}
                      </button>
                      <button type="button" onClick={() => deleteList(list.id)} className="grid size-7 place-items-center rounded-full hover:bg-white/70">
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`flex w-full gap-3 rounded-lg px-3 py-3 text-left transition ${selectedChatId === chat.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                    {chat.isGroup ? <Users size={18} /> : <MessageCircle size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-950">{chat.name}</span>
                      {chat.unreadCount ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">{chat.unreadCount}</span> : null}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{chat.lastMessage || 'No recent message'}</span>
                  </span>
                </button>
              ))}
              {!filteredChats.length ? <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm font-bold text-slate-500">No WhatsApp chats found.</p> : null}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-[#e7f3ef]">
            <div className="relative flex shrink-0 items-center justify-between border-b border-teal-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => selectedChat && setChatMenuOpen((current) => !current)}
                  className="flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                  disabled={!selectedChat}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-950">{selectedChat?.name || 'Select a chat'}</span>
                    <span className="block text-xs font-semibold text-slate-500">{selectedChat?.isGroup ? 'Group chat' : 'WhatsApp conversation'}</span>
                  </span>
                  {selectedChat ? <ChevronDown className={`shrink-0 text-slate-400 transition ${chatMenuOpen ? 'rotate-180' : ''}`} size={17} /> : null}
                </button>
                {selectedChat && chatMenuOpen ? (
                  <div className="absolute left-4 top-[calc(100%-2px)] z-30 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-sm font-bold text-slate-950">{selectedChat.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {selectedChat.isGroup ? 'Group' : 'Contact'} {selectedChat.archived ? '- Archived' : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => toggleFavorite()} className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                      <span className="flex items-center gap-2">
                        <Star size={16} />
                        Favorite
                      </span>
                      <span className={favoriteChatIds.includes(selectedChat.id) ? 'text-amber-600' : 'text-slate-400'}>
                        {favoriteChatIds.includes(selectedChat.id) ? 'On' : 'Off'}
                      </span>
                    </button>
                    {customLists.length ? (
                      <div className="mt-2 rounded-lg bg-slate-50 p-2">
                        <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Lists</p>
                        {customLists.map((list) => (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => toggleChatInList(list.id)}
                            className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-bold text-slate-700 hover:bg-white"
                          >
                            <span className="truncate">{list.name}</span>
                            <span className={list.chatIds.includes(selectedChat.id) ? 'text-teal-700' : 'text-slate-400'}>
                              {list.chatIds.includes(selectedChat.id) ? 'Added' : 'Add'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Create a new list to organize chats.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedChat ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFavorite()}
                      className={`grid size-10 place-items-center rounded-lg border ${
                        favoriteChatIds.includes(selectedChat.id) ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Toggle favorite"
                    >
                      <Star size={17} />
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={() => loadMessages()} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            {chatError ? <p className="m-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{chatError}</p> : null}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((item) => (
                <div key={item.id} className={`flex ${item.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] px-3 py-2 shadow-sm ${item.fromMe ? 'rounded-lg rounded-tr-none bg-teal-100' : 'rounded-lg rounded-tl-none bg-white'}`}>
                    <p className={`text-xs font-bold ${item.fromMe ? 'text-teal-800' : 'text-teal-700'}`}>{item.fromMe ? 'You' : item.fromName || selectedChat?.name}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{item.body || `[${item.type}]`}</p>
                    {item.createdAt ? <p className="mt-1 text-right text-[11px] font-semibold text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> : null}
                  </div>
                </div>
              ))}
              {selectedChatId && !messages.length ? <p className="rounded-lg bg-white/80 px-3 py-3 text-center text-sm font-semibold text-slate-500">No messages in this chat yet.</p> : null}
              {!selectedChatId ? <p className="rounded-lg bg-white/80 px-3 py-3 text-center text-sm font-semibold text-slate-500">Select a WhatsApp chat from the left side.</p> : null}
            </div>

            <div className="border-t border-teal-100 bg-white p-3">
              <div className="flex items-end gap-2">
                <input
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-teal-500"
                  disabled={!selectedChatId}
                  placeholder={selectedChatId ? 'Type WhatsApp message' : 'Select chat first'}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      sendMessage()
                    }
                  }}
                />
                <button type="button" onClick={sendMessage} disabled={!reply.trim() || !selectedChatId} className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-600 text-white disabled:opacity-50">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center lg:p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => loadStatus()} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                <RefreshCw size={16} />
                Refresh
              </button>
              <button type="button" onClick={resetSession} disabled={isLoading} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 disabled:opacity-60">
                <RotateCcw size={16} />
                Reset
              </button>
              <button type="button" onClick={startSession} disabled={isLoading} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white disabled:opacity-60">
                <MessageCircle size={16} />
                {isLoading ? 'Loading...' : 'Start'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <MessageCircle size={22} />
              </span>
              <div>
                <p className="font-bold text-slate-950">{session.status === 'authenticated' ? 'Login complete' : 'Waiting for scan'}</p>
                <p className="text-sm text-slate-500">
                  {session.status === 'authenticated' ? 'The chat panel will open when WhatsApp Web is ready.' : 'Open Linked Devices in WhatsApp mobile and scan the QR.'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mobile Number</p>
                <p className="mt-1 font-bold text-slate-950">{session.number || 'Not linked'}</p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Session Status</p>
                <p className="mt-1 font-bold text-amber-700">{session.status}</p>
              </div>
            </div>
            {message ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600">{message}</p> : null}
            {session.lastError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{session.lastError}</p> : null}
          </div>

          <div className="mx-auto">
            <div className="grid size-60 place-items-center rounded-lg border border-slate-200 bg-white p-3 shadow-inner">
              {session.qrImage ? (
                <img src={session.qrImage} alt="WhatsApp Web QR code" className="h-full w-full rounded-md object-contain" />
              ) : session.status === 'authenticated' ? (
                <div className="px-4 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={46} />
                  <p className="mt-3 text-sm font-bold text-emerald-700">Logged in. Syncing chats...</p>
                </div>
              ) : (
                <div className="px-4 text-center">
                  <MessageCircle className="mx-auto text-slate-300" size={42} />
                  <p className="mt-3 text-sm font-bold text-slate-500">The QR will appear here after starting the session.</p>
                </div>
              )}
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
              <Smartphone size={16} />
              Scan from mobile
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
