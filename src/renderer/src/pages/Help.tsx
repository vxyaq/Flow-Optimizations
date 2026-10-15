import { invoke } from "@/lib/electron"
import RootDiv from "@/components/rootdiv"
import { Loader2, Send, ShieldCheck, UserRound } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import flowOptimizationsLogo from "../assets/flow-optimizations-logo.svg"

const CHAT_ADMIN_IDS = new Set(["1424802704210923711", "988127568295264286"])

type ChatMessage = {
  id: string
  from: "user" | "admin"
  type: "text" | "image" | "link"
  content: string
  createdAt: number
  avatarUrl?: string | null
  displayName?: string | null
}

type ThreadSummary = {
  discordId: string
  displayName: string
  avatarUrl: string | null
  unread: boolean
  status: "open" | "closed"
  updatedAt: number
  lastMessage: { from: string; type: string; preview: string; createdAt: number } | null
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        className="text-flow-primary underline break-all hover:opacity-80"
        onClick={(e) => {
          e.preventDefault()
          void window.electron.ipcRenderer.invoke("open-external", part).catch(() => {
            window.open(part, "_blank")
          })
        }}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024

function ImageAttachment({ src }: { src: string }) {
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [zoom])

  return (
    <>
      <img
        src={src}
        alt="attachment"
        onClick={() => setZoom(true)}
        className="max-h-64 cursor-zoom-in rounded-xl border border-flow-border object-contain transition-opacity hover:opacity-90"
      />
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setZoom(false)}
        >
          <img
            src={src}
            alt="attachment preview"
            className="max-h-full max-w-full cursor-zoom-out rounded-xl object-contain"
            onClick={() => setZoom(false)}
          />
        </div>
      )}
    </>
  )
}

function MessageBubble({
  message,
  showSender,
  avatarUrl,
  senderName,
  isMine,
}: {
  message: ChatMessage
  showSender: boolean
  avatarUrl: string | null
  senderName: string
  isMine: boolean
}) {
  return (
    <div className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={senderName}
          referrerPolicy="no-referrer"
          className="h-8 w-8 shrink-0 rounded-full border border-flow-border object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      ) : (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isMine ? "bg-flow-primary/15 text-flow-primary" : "bg-flow-accent text-flow-text"
          }`}
        >
          {isMine ? <UserRound size={16} /> : <ShieldCheck size={16} />}
        </div>
      )}
      <div className={`flex max-w-[70%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {showSender && <span className="text-xs text-flow-text-muted">{senderName}</span>}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
            isMine ? "bg-flow-primary/15 text-flow-text" : "bg-flow-accent text-flow-text"
          }`}
        >
          {message.type === "image" ? (
            <ImageAttachment src={message.content} />
          ) : message.type === "link" ? (
            <a
              href={message.content}
              className="text-flow-primary underline break-all hover:opacity-80"
              onClick={(e) => {
                e.preventDefault()
                void window.electron.ipcRenderer
                  .invoke("open-external", message.content)
                  .catch(() => window.open(message.content, "_blank"))
              }}
            >
              {message.content}
            </a>
          ) : (
            linkify(message.content)
          )}
        </div>
        <span className="text-[11px] text-flow-text-muted">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  )
}

type AccountProfile = {
  id: string
  displayName: string
  avatarUrl?: string | null
}

function useChatContext() {
  const [hwid, setHwid] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountProfile | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)

  useEffect(() => {
    void invoke({ channel: "get-system-uuid" })
      .then((uuid) => {
        setHwid(uuid && uuid !== "Unknown" ? String(uuid) : null)
      })
      .catch(() => {
        setHwid(null)
      })
    void invoke({ channel: "auth:get-session" })
      .then((session) => {
        setAccount(
          session?.id
            ? {
                id: String(session.id),
                displayName: String(session.displayName ?? "User"),
                avatarUrl: (session.avatarUrl as string | null | undefined) ?? null,
              }
            : null,
        )
      })
      .catch(() => setAccount(null))
    void invoke({ channel: "auth:get-server-url" })
      .then((url) => setServerUrl(url ? String(url) : null))
      .catch(() => setServerUrl(null))
  }, [])

  return { hwid, account, serverUrl }
}

function isSignInError(error?: string): boolean {
  return !!error && /sign in/i.test(error)
}

async function relogin() {
  try {
    await invoke({ channel: "auth:logout" })
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("auth:changed"))
  window.location.hash = "#/account"
  window.location.reload()
}

function SessionExpired({
  hwid,
  account,
  serverUrl,
}: {
  hwid: string
  account: AccountProfile | null
  serverUrl: string | null
}) {
  const [copied, setCopied] = useState(false)

  const copyDiagnostics = async () => {
    const payload = JSON.stringify(
      { hwid, discordId: account?.id ?? null, serverUrl },
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = payload
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-flow-primary/15 text-flow-primary">
        <ShieldCheck size={22} />
      </div>
      <p className="text-sm font-semibold text-flow-text">Support session expired</p>
      <p className="max-w-sm text-sm text-flow-text-secondary">
        The support server doesn&apos;t recognize this PC. Sign out and sign back in with
        Discord on this computer to link it, then reopen Get Help.
      </p>
      <button
        type="button"
        onClick={() => void relogin()}
        className="rounded-xl bg-flow-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Sign in again
      </button>
      <div className="mt-1 flex max-w-sm flex-col items-center gap-1.5 rounded-xl border border-flow-border bg-flow-card/40 px-3 py-2">
        <p className="text-[11px] text-flow-text-muted">
          Still failing after re-login? Send these to support:
        </p>
        <code className="text-[11px] text-flow-text-secondary break-all">
          hwid={hwid.slice(0, 13)}… · discord={account?.id ?? "—"}
        </code>
        <button
          type="button"
          onClick={() => void copyDiagnostics()}
          className="rounded-lg border border-flow-border px-2.5 py-1 text-[11px] text-flow-text-secondary transition-colors hover:bg-flow-accent hover:text-flow-text"
        >
          {copied ? "Copied!" : "Copy diagnostics"}
        </button>
      </div>
    </div>
  )
}

type ChatResult = { ok: boolean; data?: any; error?: string }

async function chatInvoke(channel: string, payload?: unknown): Promise<ChatResult> {
  try {
    const res = (await invoke({ channel, payload, timeoutMs: 20000 })) as ChatResult
    if (!res || typeof res.ok !== "boolean") return { ok: false, error: "Bad response from main process." }
    return res
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function Composer({
  onSend,
  disabled,
}: {
  onSend: (type: "text" | "image" | "link", content: string) => Promise<void>
  disabled: boolean
}) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const submit = async () => {
    const text = draft.trim()
    if (!text || sending) return
    const type = /^https?:\/\/\S+$/i.test(text) ? ("link" as const) : ("text" as const)
    setSending(true)
    try {
      await onSend(type, text)
      setDraft("")
    } finally {
      setSending(false)
    }
  }

  const pickImage = () => fileRef.current?.click()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large (max ~1.5 MB).")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "")
      setSending(true)
      try {
        await onSend("image", dataUrl)
      } finally {
        setSending(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-end gap-2 border-t border-flow-border pt-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <button
        type="button"
        onClick={pickImage}
        disabled={sending || disabled}
        title="Send image"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-flow-border text-flow-text-secondary transition-colors hover:bg-flow-accent hover:text-flow-text disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </button>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void submit()
          }
        }}
        rows={1}
        placeholder="Write a message… (Enter to send)"
        className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-flow-border bg-flow-accent/40 px-3.5 py-2.5 text-sm text-flow-text placeholder:text-flow-text-muted focus:outline-none focus:border-flow-border-secondary"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={sending || disabled || !draft.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flow-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  )
}

function UserChat({
  hwid,
  account,
  serverUrl,
}: {
  hwid: string
  account: AccountProfile | null
  serverUrl: string | null
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    const res = await chatInvoke("chat:get-messages", { hwid, account })
    if (res.ok) {
      setNeedsLogin(false)
      setMessages(((res.data?.messages ?? []) as ChatMessage[]) ?? [])
    } else if (isSignInError(res.error)) {
      setNeedsLogin(true)
    }
    setLoading(false)
  }, [hwid, account])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 4000)
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const send = async (type: "text" | "image" | "link", content: string) => {
    const res = await chatInvoke("chat:send", { hwid, account, type, content })
    if (!res.ok) {
      if (isSignInError(res.error)) {
        setNeedsLogin(true)
        toast.error("Session expired on the support server. Please sign in again.")
      } else {
        toast.error(res.error ?? "Failed to send.")
      }
      return
    }
    setNeedsLogin(false)
    await refresh()
  }

  if (needsLogin) {
    return <SessionExpired hwid={hwid} account={account} serverUrl={serverUrl} />
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={listRef}
        className="no-scrollbar mb-3 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-flow-border bg-flow-card/40 p-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-flow-text-secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-flow-text">No messages yet</p>
            <p className="text-sm text-flow-text-secondary">
              Ask anything — attach a screenshot or paste a link if it helps.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.from === "user"
            return (
              <MessageBubble
                key={m.id}
                message={m}
                showSender={i === 0 || messages[i - 1].from !== m.from}
                isMine={mine}
                senderName={
                  mine ? (account?.displayName ?? "You") : (m.displayName ?? "Support")
                }
                avatarUrl={
                  mine ? (account?.avatarUrl ?? null) : (m.avatarUrl ?? flowOptimizationsLogo)
                }
              />
            )
          })
        )}
      </div>
      <Composer onSend={send} disabled={false} />
    </div>
  )
}

function AdminChat({
  hwid,
  account,
  serverUrl,
}: {
  hwid: string
  account: AccountProfile | null
  serverUrl: string | null
}) {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [chatClosed, setChatClosed] = useState<boolean | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  const closedCount = threads.filter((t) => t.status === "closed").length
  const visibleThreads = showClosed
    ? threads
    : threads.filter((t) => t.status !== "closed")
  const selectedThread = threads.find((t) => t.discordId === selected) ?? null
  const isClosed =
    chatClosed ?? (selectedThread ? selectedThread.status === "closed" : false)

  const refreshThreads = useCallback(async () => {
    const res = await chatInvoke("chat:admin:threads", { hwid, account })
    if (res.ok) {
      setNeedsLogin(false)
      const newThreads = ((res.data?.threads ?? []) as ThreadSummary[]) ?? []
      setThreads(newThreads)

      if (selected) {
        const updatedSelectedThread = newThreads.find((t) => t.discordId === selected)
        if (updatedSelectedThread) {
          setChatClosed(updatedSelectedThread.status === "closed")
        } else {
          setSelected(null)
          setMessages([])
          setChatClosed(null)
        }
      }
    } else if (isSignInError(res.error)) {
      setNeedsLogin(true)
    }
    setLoading(false)
  }, [hwid, account, selected])

  const refreshMessages = useCallback(async () => {
    if (!selected) return
    const res = await chatInvoke("chat:admin:messages", { hwid, account, target: selected })
    if (res.ok) {
      setNeedsLogin(false)
      setMessages(((res.data?.messages ?? []) as ChatMessage[]) ?? [])
      if (res.data?.status !== undefined) {
        setChatClosed(res.data.status === "closed")
      }
    } else if (isSignInError(res.error)) {
      setNeedsLogin(true)
    }
  }, [hwid, account, selected])

  useEffect(() => {
    if (selectedThread) {
      setChatClosed(selectedThread.status === "closed")
    } else {
      setChatClosed(null)
    }
  }, [selected, selectedThread])

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-ticket-menu="true"]')) return
      setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null)
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("keydown", onKey)
    }
  }, [menu])

  const toggleTicket = async (target: string, closed: boolean) => {
    setMenu(null)
    console.log(`[chat] ${closed ? "closing" : "reopening"} ticket:`, target)
    const toastId = toast.loading(closed ? "Closing ticket…" : "Reopening ticket…")
    const res = await chatInvoke("chat:admin:close", { hwid, account, target, closed })
    toast.dismiss(toastId)
    console.log("[chat] close result:", res)
    if (!res.ok) {
      const err = res.error ?? "Failed to update ticket."
      toast.error(
        err === "Not found."
          ? "Server is too old — deploy the new server.js on the host."
          : err,
      )
      return
    }
    if (closed && target === selected) {
      setSelected(null)
      setMessages([])
      setChatClosed(null)
    }
    toast.success(closed ? "Ticket closed and deleted." : "Ticket reopened.")
    await refreshThreads()
    if (!closed) await refreshMessages()
  }

  useEffect(() => {
    void refreshThreads()
    const timer = setInterval(() => {
      void refreshThreads()
      void refreshMessages()
    }, 4000)
    return () => clearInterval(timer)
  }, [refreshThreads, refreshMessages])

  useEffect(() => {
    void refreshMessages()
  }, [refreshMessages])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const send = async (type: "text" | "image" | "link", content: string) => {
    if (!selected || isClosed) return
    const res = await chatInvoke("chat:admin:send", { hwid, account, target: selected, type, content })
    if (!res.ok) {
      if (isSignInError(res.error)) {
        setNeedsLogin(true)
        toast.error("Session expired on the support server. Please sign in again.")
      } else {
        toast.error(res.error ?? "Failed to send.")
      }
      return
    }
    setNeedsLogin(false)
    await refreshMessages()
  }

  if (needsLogin) {
    return <SessionExpired hwid={hwid} account={account} serverUrl={serverUrl} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Thread list */}
        <div className="no-scrollbar w-72 shrink-0 overflow-y-auto rounded-2xl border border-flow-border bg-flow-card/40 p-2">
          {closedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowClosed((v) => !v)}
              className="mb-1 flex w-full items-center justify-center rounded-xl px-2 py-1.5 text-[11px] text-flow-text-muted transition-colors hover:bg-flow-accent hover:text-flow-text"
            >
              {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
            </button>
          )}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={20} className="animate-spin text-flow-text-secondary" />
            </div>
          ) : visibleThreads.length === 0 ? (
            <p className="p-4 text-center text-sm text-flow-text-secondary">No conversations yet.</p>
          ) : (
            visibleThreads.map((t) => {
              const closed = t.status === "closed"
              if (menu === t.discordId) {
                return (
                  <button
                    key={t.discordId}
                    type="button"
                    data-ticket-menu="true"
                    onClick={() => void toggleTicket(t.discordId, !closed)}
                    className="flex w-full items-center justify-center rounded-xl bg-flow-primary/15 p-2.5 text-sm font-medium text-flow-primary transition-opacity hover:opacity-90"
                  >
                    {closed ? "Reopen ticket" : "Close ticket"}
                  </button>
                )
              }
              return (
                <button
                  key={t.discordId}
                  type="button"
                  onClick={() => setSelected(t.discordId)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenu(t.discordId)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${
                    selected === t.discordId
                      ? "bg-flow-accent text-flow-text"
                      : "text-flow-text-secondary hover:bg-flow-accent/50 hover:text-flow-text"
                  } ${closed ? "opacity-60" : ""}`}
                >
                  {t.avatarUrl ? (
                    <img
                      src={t.avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flow-primary/15 text-sm font-bold text-flow-primary">
                      {(t.displayName ?? "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t.displayName}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {closed && (
                          <span className="rounded-full border border-flow-border px-1.5 py-0.5 text-[10px] text-flow-text-muted">
                            Closed
                          </span>
                        )}
                        {t.unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-flow-primary" />
                        )}
                      </span>
                    </div>
                    <p className="truncate text-xs text-flow-text-muted">
                      {t.lastMessage
                        ? `${t.lastMessage.from === "admin" ? "You: " : ""}${t.lastMessage.preview}`
                        : "—"}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div
                ref={listRef}
                className="no-scrollbar mb-3 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-flow-border bg-flow-card/40 p-4"
              >
                {messages.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-flow-text-secondary">
                    No messages in this conversation.
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const mine = m.from === "admin"
                    const peer = threads.find((t) => t.discordId === selected)
                    return (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        showSender={i === 0 || messages[i - 1].from !== m.from}
                        isMine={mine}
                        senderName={
                          mine
                            ? (account?.displayName ?? "You")
                            : (peer?.displayName ?? m.displayName ?? "User")
                        }
                        avatarUrl={
                          mine
                            ? (account?.avatarUrl ?? null)
                            : (peer?.avatarUrl ?? m.avatarUrl ?? null)
                        }
                      />
                    )
                  })
                )}
              </div>
              {isClosed && selected && (
                <p className="mb-2 rounded-xl border border-flow-border bg-flow-card/40 px-3 py-2 text-center text-xs text-flow-text-muted">
                  Ticket closed — reopen it from the list (right-click) to reply.
                </p>
              )}
              <Composer onSend={send} disabled={isClosed} />
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-flow-border bg-flow-card/40">
              <p className="text-sm text-flow-text-secondary">Select a conversation on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Help() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const { hwid, account, serverUrl } = useChatContext()

  useEffect(() => {
    setAccountId(account?.id ? String(account.id) : null)
  }, [account])

  if (!hwid) {
    return (
      <RootDiv>
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-flow-text-secondary" />
          <p className="text-xs text-flow-text-muted">Loading...</p>
        </div>
      </RootDiv>
    )
  }

  const isAdmin = accountId ? CHAT_ADMIN_IDS.has(accountId) : false

  return (
    <RootDiv>
      <div className="h-full p-4">
        {isAdmin ? (
          <AdminChat hwid={hwid} account={account} serverUrl={serverUrl} />
        ) : (
          <UserChat hwid={hwid} account={account} serverUrl={serverUrl} />
        )}
      </div>
    </RootDiv>
  )
}

export default Help