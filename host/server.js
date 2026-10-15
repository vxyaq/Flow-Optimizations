import { createServer } from "node:http"
import { randomBytes } from "node:crypto"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))

try {
  const envPath = join(root, ".env")
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  }
} catch {
  /* ignore */
}

const PORT = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3000)
const BASE_URL = (process.env.BASE_URL ?? "").replace(/\/+$/, "")
const APP_CALLBACK = process.env.APP_CALLBACK ?? "http://127.0.0.1:43817/oauth/discord/callback"
const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? ""
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? ""
const ADMIN_KEY = process.env.ADMIN_KEY ?? ""
const DB_PATH = process.env.DB_PATH ?? join(root, "db.json")

const CHAT_ADMIN_IDS = new Set(
  (process.env.CHAT_ADMIN_IDS ?? "1424802704210923711,988127568295264286")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)

const REDIRECT_URI = `${BASE_URL}/auth/discord/callback`

function loadDb() {
  try {
    if (existsSync(DB_PATH)) {
      const parsed = JSON.parse(readFileSync(DB_PATH, "utf8"))
      return {
        users: parsed.users ?? {},
        hwids: parsed.hwids ?? {},
        tickets: parsed.tickets ?? {},
      }
    }
  } catch {
    /* ignore */
  }
  return { users: {}, hwids: {}, tickets: {} }
}
let db = loadDb()
function saveDb() {
  try {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  } catch (e) {
    console.error("db write failed:", e)
  }
}

const SUPPORT_PATH = process.env.SUPPORT_PATH ?? join(root, "support.json")
function loadChats() {
  try {
    if (existsSync(SUPPORT_PATH)) {
      const parsed = JSON.parse(readFileSync(SUPPORT_PATH, "utf8"))
      if (parsed.chats && typeof parsed.chats === "object") return parsed.chats
    }
  } catch {
    /* ignore */
  }
  try {
    if (existsSync(DB_PATH)) {
      const parsed = JSON.parse(readFileSync(DB_PATH, "utf8"))
      if (parsed.chats && typeof parsed.chats === "object") return parsed.chats
    }
  } catch {
    /* ignore */
  }
  return {}
}
let chats = loadChats()
function saveSupport() {
  try {
    writeFileSync(SUPPORT_PATH, JSON.stringify({ chats }, null, 2))
  } catch (e) {
    console.error("support write failed:", e)
  }
}
setInterval(() => {
  const now = Date.now()
  let dirty = false
  for (const [k, t] of Object.entries(db.tickets)) {
    if (now - t.createdAt > 10 * 60 * 1000) {
      delete db.tickets[k]
      dirty = true
    }
  }
  if (dirty) saveDb()
}, 60 * 1000).unref()

const planForHwid = (hwid) => (hwid && db.hwids[hwid]?.plan === "pro" ? "pro" : "free")

const streams = new Map()

function pushPlan(hwid) {
  const set = streams.get(hwid)
  if (!set || !set.size) return
  const payload = "data: " + JSON.stringify({ plan: planForHwid(hwid) }) + "\n\n"
  for (const res of [...set]) {
    try {
      res.write(payload)
    } catch {
      set.delete(res)
    }
  }
}

function json(res, status, obj, extraHeaders) {
  res.writeHead(status, { "Content-Type": "application/json", ...(extraHeaders ?? {}) })
  res.end(JSON.stringify(obj))
}

const CHAT_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function chatJson(res, status, obj) {
  json(res, status, obj, CHAT_CORS)
}

const hits = new Map()

function limited(req, res, key, max, ms) {
  const now = Date.now()
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?"
  const id = ip + "|" + key
  let e = hits.get(id)
  if (!e || now > e.reset) {
    e = { n: 0, reset: now + ms }
    hits.set(id, e)
  }
  e.n += 1
  if (e.n > max) {
    json(res, 429, { error: "Too many requests." })
    return false
  }
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [k, e] of hits) {
    if (now > e.reset) hits.delete(k)
  }
}, 60 * 1000).unref()

function readBody(req, maxBytes = 65536) {
  return new Promise((resolve) => {
    let buf = ""
    req.on("data", (c) => {
      buf += c
      if (buf.length > maxBytes) {
        try {
          req.destroy()
        } catch {
          /* ignore */
        }
        resolve(null)
      }
    })
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {})
      } catch {
        resolve({})
      }
    })
  })
}

const MAX_CHAT_MESSAGES = 200

function previewOf(type, content) {
  if (type === "image") return "[Image]"
  const text = String(content ?? "")
  return text.length > 80 ? text.slice(0, 80) + "…" : text
}

function profileOf(discordId) {
  const u = db.users[discordId] ?? {}
  return {
    displayName: typeof u.displayName === "string" ? u.displayName : "User",
    avatarUrl: typeof u.avatarUrl === "string" ? u.avatarUrl : null,
  }
}

function resolveChatIdentity(hwid, claimed) {
  const clean = typeof hwid === "string" ? hwid.slice(0, 128) : ""
  if (!clean) return null
  const linked = db.hwids[clean]?.discordId
  if (linked) return linked
  const claimedId =
    claimed && typeof claimed.discordId === "string" ? claimed.discordId.trim().slice(0, 64) : ""
  if (claimedId && db.users[claimedId]?.hwid === clean) {
    db.hwids[clean] = { plan: planForHwid(clean), discordId: claimedId }
    saveDb()
    return claimedId
  }
  return null
}

function getOrCreateChat(discordId, fallback) {
  if (!chats[discordId]) {
    const known = profileOf(discordId)
    chats[discordId] = {
      displayName:
        fallback && typeof fallback.displayName === "string" && fallback.displayName
          ? fallback.displayName.slice(0, 64)
          : known.displayName,
      avatarUrl:
        fallback && typeof fallback.avatarUrl === "string" && fallback.avatarUrl
          ? fallback.avatarUrl.slice(0, 512)
          : known.avatarUrl,
      unread: false,
      status: "open",
      updatedAt: Date.now(),
      messages: [],
    }
  }
  if (chats[discordId].status !== "open" && chats[discordId].status !== "closed") {
    chats[discordId].status = "open"
  }
  return chats[discordId]
}

function pushChatMessage(chat, { from, type, content, avatarUrl, displayName }) {
  const msg = {
    id: randomBytes(16).toString("hex"),
    from,
    type,
    content,
    createdAt: Date.now(),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(displayName ? { displayName } : {}),
  }
  chat.messages.push(msg)
  if (chat.messages.length > MAX_CHAT_MESSAGES) {
    chat.messages.splice(0, chat.messages.length - MAX_CHAT_MESSAGES)
  }
  chat.updatedAt = msg.createdAt
  return msg
}

function threadSummary(discordId, chat) {
  const last = chat.messages[chat.messages.length - 1] ?? null
  return {
    discordId,
    displayName: chat.displayName ?? "User",
    avatarUrl: chat.avatarUrl ?? null,
    unread: !!chat.unread,
    status: chat.status === "closed" ? "closed" : "open",
    updatedAt: chat.updatedAt ?? 0,
    lastMessage: last
      ? {
          from: last.from,
          type: last.type,
          preview: previewOf(last.type, last.content),
          createdAt: last.createdAt,
        }
      : null,
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", BASE_URL || "http://localhost")

  if (req.method === "OPTIONS") {
    res.writeHead(204, CHAT_CORS)
    return res.end()
  }

  if (req.method === "GET" && (url.pathname === "/panel" || url.pathname === "/panel/index.html")) {
    try {
      const html = readFileSync(join(root, "index.html"), "utf8")
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      return res.end(html)
    } catch {
      return json(res, 404, { error: "Not found." })
    }
  }

  if (req.method === "GET" && url.pathname === "/bg.webp") {
    try {
      const img = readFileSync(join(root, "bg.webp"))
      res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" })
      return res.end(img)
    } catch {
      return json(res, 404, { error: "Not found." })
    }
  }

  if (req.method === "GET" && url.pathname === "/logo.png") {
    try {
      const img = readFileSync(join(root, "logo.png"))
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" })
      return res.end(img)
    } catch {
      return json(res, 404, { error: "Not found." })
    }
  }

  if (req.method === "GET" && url.pathname === "/banner.png") {
    try {
      const img = readFileSync(join(root, "banner.png"))
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" })
      return res.end(img)
    } catch {
      return json(res, 404, { error: "Not found." })
    }
  }

  if (req.method === "GET" && url.pathname === "/") {
    return json(res, 200, { ok: true, service: "flow-auth" })
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const hwid = (url.searchParams.get("hwid") ?? "").slice(0, 128)
    if (!hwid) return json(res, 400, { error: "Missing hwid." })
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })
    res.write("retry: 10000\n\n")
    res.write("data: " + JSON.stringify({ plan: planForHwid(hwid) }) + "\n\n")
    if (!streams.get(hwid)) streams.set(hwid, new Set())
    streams.get(hwid).add(res)
    const beat = setInterval(() => {
      try {
        res.write(": ping\n\n")
      } catch {
        /* ignore */
      }
    }, 25000)
    req.on("close", () => {
      clearInterval(beat)
      const set = streams.get(hwid)
      if (set) {
        set.delete(res)
        if (!set.size) streams.delete(hwid)
      }
    })
    return
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true })
  }

  const adminKeyFrom = (body) => {
    const header = req.headers["x-admin-key"]
    const query = url.searchParams.get("key")
    const b = body && typeof body.adminKey === "string" ? body.adminKey : ""
    const h = typeof header === "string" ? header : ""
    return b || h || query || ""
  }

  if (req.method === "GET" && url.pathname === "/auth/discord") {
    if (!limited(req, res, "oauth", 30, 60_000)) return
    const state = url.searchParams.get("state") ?? ""
    if (!/^[a-f0-9]{16,128}$/.test(state)) return json(res, 400, { error: "Bad state." })
    if (!CLIENT_ID || !BASE_URL) return json(res, 500, { error: "Server misconfigured." })
    const auth = new URL("https://discord.com/oauth2/authorize")
    auth.searchParams.set("client_id", CLIENT_ID)
    auth.searchParams.set("redirect_uri", REDIRECT_URI)
    auth.searchParams.set("response_type", "code")
    auth.searchParams.set("scope", "identify email")
    auth.searchParams.set("state", state)
    auth.searchParams.set("prompt", "consent")
    res.writeHead(302, { Location: auth.toString() })
    return res.end()
  }

  if (req.method === "GET" && url.pathname === "/auth/discord/callback") {
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state") ?? ""
    const err = url.searchParams.get("error")
    if (err || !code) {
      res.writeHead(302, {
        Location: `${APP_CALLBACK}?error=${encodeURIComponent(err ?? "cancelled")}&state=${encodeURIComponent(state)}`,
      })
      return res.end()
    }
    try {
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })
      if (!tokenRes.ok) throw new Error(`token exchange ${tokenRes.status}`)
      const { access_token } = await tokenRes.json()
      const meRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!meRes.ok) throw new Error(`profile ${meRes.status}`)
      const me = await meRes.json()
      const ticket = randomBytes(32).toString("hex")
      db.tickets[ticket] = {
        discordId: me.id,
        displayName: me.global_name ?? me.username,
        email: me.email ?? undefined,
        avatarUrl: me.avatar
          ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
          : undefined,
        createdAt: Date.now(),
      }
      saveDb()
      res.writeHead(302, {
        Location: `${APP_CALLBACK}?ticket=${ticket}&state=${encodeURIComponent(state)}`,
      })
      return res.end()
    } catch (e) {
      console.error("oauth callback failed:", e)
      res.writeHead(302, {
        Location: `${APP_CALLBACK}?error=${encodeURIComponent("oauth_failed")}&state=${encodeURIComponent(state)}`,
      })
      return res.end()
    }
  }

  if (req.method === "POST" && url.pathname === "/auth/discord/consume") {
    if (!limited(req, res, "consume", 20, 60_000)) return
    const body = await readBody(req)
    if (body === null) return json(res, 413, { error: "Body too large." })
    const { ticket, hwid } = body
    const t = typeof ticket === "string" ? db.tickets[ticket] : null
    if (!t) return json(res, 400, { error: "Invalid or expired ticket." })
    delete db.tickets[ticket]
    const cleanHwid = typeof hwid === "string" ? hwid.slice(0, 128) : ""
    db.users[t.discordId] = { ...t, hwid: cleanHwid || db.users[t.discordId]?.hwid }
    if (cleanHwid) {
      db.hwids[cleanHwid] = {
        plan: db.hwids[cleanHwid]?.plan ?? "free",
        discordId: t.discordId,
      }
    }
    saveDb()
    return json(res, 200, {
      account: {
        provider: "discord",
        id: t.discordId,
        displayName: t.displayName,
        email: t.email,
        avatarUrl: t.avatarUrl,
        plan: planForHwid(cleanHwid),
      },
    })
  }

  if (req.method === "GET" && url.pathname === "/plan") {
    return json(res, 200, { plan: planForHwid(url.searchParams.get("hwid") ?? "") })
  }

  if (req.method === "GET" && url.pathname === "/license") {
    const hwid = url.searchParams.get("hwid") ?? ""
    const plan = planForHwid(hwid)
    return json(res, 200, { hwid, plan, status: "active" })
  }

  if (req.method === "POST" && url.pathname === "/admin/grant") {
    if (!limited(req, res, "admin", 60, 60_000)) return
    const body = await readBody(req)
    if (body === null) return json(res, 413, { error: "Body too large." })
    const { hwid, plan } = body
    if (!ADMIN_KEY || adminKeyFrom(body) !== ADMIN_KEY)
      return json(res, 403, { error: "Forbidden." })
    if (typeof hwid !== "string" || !hwid) return json(res, 400, { error: "Missing hwid." })
    if (plan !== "pro" && plan !== "free") return json(res, 400, { error: "Bad plan." })
    db.hwids[hwid] = { plan, discordId: db.hwids[hwid]?.discordId }
    saveDb()
    pushPlan(hwid)
    return json(res, 200, { ok: true, hwid, plan })
  }

  if (req.method === "POST" && url.pathname === "/admin/verify") {
    if (!limited(req, res, "admin", 60, 60_000)) return
    const body = await readBody(req)
    if (body === null) return json(res, 413, { error: "Body too large." })
    if (!ADMIN_KEY || adminKeyFrom(body) !== ADMIN_KEY)
      return json(res, 403, { error: "Forbidden." })
    return json(res, 200, { ok: true })
  }

  if (req.method === "GET" && url.pathname === "/admin/hwids") {
    if (!ADMIN_KEY || adminKeyFrom(null) !== ADMIN_KEY)
      return json(res, 403, { error: "Forbidden." })
    const hwids = Object.entries(db.hwids).map(([hwid, v]) => ({
      hwid,
      plan: v.plan,
      discordId: v.discordId ?? null,
    }))
    return json(res, 200, { hwids })
  }

  if (req.method === "POST" && url.pathname === "/admin/revoke") {
    if (!limited(req, res, "admin", 60, 60_000)) return
    const body = await readBody(req)
    if (body === null) return json(res, 413, { error: "Body too large." })
    const { hwid } = body
    if (!ADMIN_KEY || adminKeyFrom(body) !== ADMIN_KEY)
      return json(res, 403, { error: "Forbidden." })
    if (typeof hwid !== "string" || !hwid) return json(res, 400, { error: "Missing hwid." })
    delete db.hwids[hwid]
    saveDb()
    pushPlan(hwid)
    return json(res, 200, { ok: true, hwid })
  }

  if (req.method === "GET" && url.pathname === "/chat/messages") {
    if (!limited(req, res, "chat-read", 60, 60_000)) return
    const hwid = url.searchParams.get("hwid") ?? ""
    const discordId = resolveChatIdentity(hwid, {
      discordId: url.searchParams.get("discordId"),
    })
    if (!discordId) return chatJson(res, 401, { error: "Sign in first." })
    const chat = chats[discordId]
    return chatJson(res, 200, { messages: chat?.messages ?? [] })
  }

  if (req.method === "POST" && url.pathname === "/chat/send") {
    if (!limited(req, res, "chat-send", 10, 60_000)) return
    const body = await readBody(req, 3 * 1024 * 1024)
    if (body === null) return chatJson(res, 413, { error: "Message too large." })
    const discordId = resolveChatIdentity(body.hwid, body)
    if (!discordId) return chatJson(res, 401, { error: "Sign in first." })
    const type = body.type
    const content = typeof body.content === "string" ? body.content : ""
    if (type !== "text" && type !== "image" && type !== "link") {
      return chatJson(res, 400, { error: "Bad message type." })
    }
    if (!content.trim() || content.length > 2_500_000) {
      return chatJson(res, 400, { error: "Bad message content." })
    }
    const me = profileOf(discordId)
    const chat = getOrCreateChat(discordId, body)
    const msg = pushChatMessage(chat, {
      from: "user",
      type,
      content,
      avatarUrl: me.avatarUrl,
      displayName: me.displayName,
    })
    chat.unread = true
    chat.status = "open"
    saveSupport()
    return chatJson(res, 200, { ok: true, id: msg.id, createdAt: msg.createdAt })
  }

  const requireAdmin = (hwid, claimed) => {
    const discordId = resolveChatIdentity(hwid, claimed)
    if (!discordId) return { error: "Sign in first.", status: 401 }
    if (!CHAT_ADMIN_IDS.has(discordId)) return { error: "Forbidden.", status: 403 }
    return { discordId }
  }

  if (req.method === "GET" && url.pathname === "/chat/admin/threads") {
    if (!limited(req, res, "chat-admin", 60, 60_000)) return
    const auth = requireAdmin(url.searchParams.get("hwid") ?? "", {
      discordId: url.searchParams.get("discordId"),
    })
    if (auth.error) return chatJson(res, auth.status, { error: auth.error })
    const threads = Object.entries(chats)
      .map(([discordId, chat]) => threadSummary(discordId, chat))
      .sort((a, b) => {
        if ((a.status === "closed") !== (b.status === "closed")) {
          return a.status === "closed" ? 1 : -1
        }
        return b.updatedAt - a.updatedAt
      })
    return chatJson(res, 200, { threads })
  }

  if (req.method === "GET" && url.pathname === "/chat/admin/messages") {
    if (!limited(req, res, "chat-admin", 60, 60_000)) return
    const auth = requireAdmin(url.searchParams.get("hwid") ?? "", {
      discordId: url.searchParams.get("discordId"),
    })
    if (auth.error) return chatJson(res, auth.status, { error: auth.error })
    const target = (url.searchParams.get("target") ?? "").slice(0, 64)
    const chat = target ? chats[target] : null
    if (chat && chat.unread) {
      chat.unread = false
      saveSupport()
    }
    return chatJson(res, 200, {
      messages: chat?.messages ?? [],
      status: chat ? (chat.status === "closed" ? "closed" : "open") : "open",
    })
  }

  if (req.method === "POST" && url.pathname === "/chat/admin/send") {
    if (!limited(req, res, "chat-admin-send", 20, 60_000)) return
    const body = await readBody(req, 3 * 1024 * 1024)
    if (body === null) return chatJson(res, 413, { error: "Message too large." })
    const auth = requireAdmin(body.hwid, body)
    if (auth.error) return chatJson(res, auth.status, { error: auth.error })
    const target = typeof body.target === "string" ? body.target.trim().slice(0, 64) : ""
    if (!target) return chatJson(res, 400, { error: "Missing conversation." })
    const type = body.type
    const content = typeof body.content === "string" ? body.content : ""
    if (type !== "text" && type !== "image" && type !== "link") {
      return chatJson(res, 400, { error: "Bad message type." })
    }
    if (!content.trim() || content.length > 2_500_000) {
      return chatJson(res, 400, { error: "Bad message content." })
    }
    const me = profileOf(auth.discordId)
    const chat = getOrCreateChat(target, null)
    const msg = pushChatMessage(chat, {
      from: "admin",
      type,
      content,
      avatarUrl: me.avatarUrl,
      displayName: me.displayName,
    })
    chat.unread = false
    chat.status = "open"
    saveSupport()
    return chatJson(res, 200, { ok: true, id: msg.id, createdAt: msg.createdAt })
  }

  if (req.method === "POST" && url.pathname === "/chat/admin/close") {
    if (!limited(req, res, "chat-admin-send", 20, 60_000)) return
    const body = await readBody(req)
    if (body === null) return chatJson(res, 413, { error: "Body too large." })
    const auth = requireAdmin(body.hwid, body)
    if (auth.error) return chatJson(res, auth.status, { error: auth.error })
    const target = typeof body.target === "string" ? body.target.trim().slice(0, 64) : ""
    if (!target || !chats[target]) return chatJson(res, 404, { error: "Conversation not found." })
    const closed = body.closed !== false
    if (closed) {
      delete chats[target]
      saveSupport()
      return chatJson(res, 200, { ok: true, status: "closed", deleted: true })
    }
    chats[target].status = "open"
    chats[target].updatedAt = Date.now()
    saveSupport()
    return chatJson(res, 200, { ok: true, status: "open" })
  }

  return json(res, 404, { error: "Not found." })
})

server.listen(PORT, "0.0.0.0", () => console.log(`flow auth server on :${PORT}`))
