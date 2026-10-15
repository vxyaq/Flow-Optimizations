import { ipcMain } from "electron"
import { getAuthServerUrl } from "@main/auth"

type ChatResult =
  | { ok: true; data: any; status: number }
  | { ok: false; error: string; status?: number }

function friendlyFetchError(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "Support server timed out. Try again in a moment."
  }
  if (error instanceof TypeError) {
    return `Could not reach the support server. (${error.message})`
  }
  if (error instanceof Error) return `Could not reach the support server. (${error.message})`
  return "Could not reach the support server."
}

async function serverFetch(path: string, init?: RequestInit): Promise<ChatResult> {
  const base = getAuthServerUrl()
  const url = `${base}${path}`
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    })
    const text = await res.text().catch(() => "")
    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      const msg =
        typeof data?.error === "string" && data.error.length > 0
          ? data.error
          : `Request failed (${res.status}).`
      return { ok: false, error: msg, status: res.status }
    }
    return { ok: true, data, status: res.status }
  } catch (error) {
    return { ok: false, error: friendlyFetchError(error) }
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function accountOf(payload: unknown): {
  discordId: string
  displayName: string
  avatarUrl: string | null
} {
  const account = (payload as any)?.account ?? {}
  return {
    discordId: asString(account?.id || (payload as any)?.discordId).trim(),
    displayName: asString(account?.displayName).trim(),
    avatarUrl:
      typeof account?.avatarUrl === "string" && account.avatarUrl.length > 0
        ? account.avatarUrl
        : null,
  }
}

function accountQuery(account: { discordId: string; displayName: string }): string {
  const params = new URLSearchParams()
  if (account.discordId) params.set("discordId", account.discordId)
  if (account.displayName) params.set("displayName", account.displayName)
  const query = params.toString()
  return query ? `&${query}` : ""
}

export function setupChatHandlers(): void {
  ipcMain.handle("chat:get-messages", async (_event, payload: unknown): Promise<ChatResult> => {
    const hwid = asString((payload as any)?.hwid).trim()
    if (!hwid) return { ok: false, error: "Missing hardware ID. Restart the app." }
    const account = accountOf(payload)
    return serverFetch(`/chat/messages?hwid=${encodeURIComponent(hwid)}${accountQuery(account)}`)
  })

  ipcMain.handle("chat:send", async (_event, payload: unknown): Promise<ChatResult> => {
    const hwid = asString((payload as any)?.hwid).trim()
    const type = asString((payload as any)?.type)
    const content = asString((payload as any)?.content)
    if (!hwid) return { ok: false, error: "Missing hardware ID. Restart the app." }
    if (!content.trim()) return { ok: false, error: "Message is empty." }
    if (type !== "text" && type !== "image" && type !== "link") {
      return { ok: false, error: "Invalid message type." }
    }
    const account = accountOf(payload)
    return serverFetch(`/chat/send`, {
      method: "POST",
      body: JSON.stringify({ hwid, type, content, ...account }),
    })
  })

  ipcMain.handle("chat:admin:threads", async (_event, payload: unknown): Promise<ChatResult> => {
    const hwid = asString((payload as any)?.hwid).trim()
    if (!hwid) return { ok: false, error: "Missing hardware ID. Restart the app." }
    const account = accountOf(payload)
    return serverFetch(
      `/chat/admin/threads?hwid=${encodeURIComponent(hwid)}${accountQuery(account)}`,
    )
  })

  ipcMain.handle(
    "chat:admin:messages",
    async (_event, payload: unknown): Promise<ChatResult> => {
      const hwid = asString((payload as any)?.hwid).trim()
      const target = asString((payload as any)?.target).trim()
      if (!hwid || !target) return { ok: false, error: "Missing conversation." }
      const account = accountOf(payload)
      return serverFetch(
        `/chat/admin/messages?hwid=${encodeURIComponent(hwid)}&target=${encodeURIComponent(target)}${accountQuery(account)}`,
      )
    },
  )

  ipcMain.handle("chat:admin:send", async (_event, payload: unknown): Promise<ChatResult> => {
    const hwid = asString((payload as any)?.hwid).trim()
    const target = asString((payload as any)?.target).trim()
    const type = asString((payload as any)?.type)
    const content = asString((payload as any)?.content)
    if (!hwid || !target) return { ok: false, error: "Missing conversation." }
    if (!content.trim()) return { ok: false, error: "Message is empty." }
    const account = accountOf(payload)
    return serverFetch(`/chat/admin/send`, {
      method: "POST",
      body: JSON.stringify({ hwid, target, type, content, ...account }),
    })
  })

  ipcMain.handle("chat:admin:close", async (_event, payload: unknown): Promise<ChatResult> => {
    const hwid = asString((payload as any)?.hwid).trim()
    const target = asString((payload as any)?.target).trim()
    if (!hwid || !target) return { ok: false, error: "Missing conversation." }
    const account = accountOf(payload)
    const closed = (payload as any)?.closed !== false
    console.log(`[chat] admin close target=${target} closed=${closed}`)
    const res = await serverFetch(`/chat/admin/close`, {
      method: "POST",
      body: JSON.stringify({ hwid, target, closed, ...account }),
    })
    console.log(`[chat] admin close done ok=${res.ok}`, res.ok ? "" : (res as any).error)
    return res
  })
}

export function cleanupChatHandlers(): void {
  ipcMain.removeHandler("chat:get-messages")
  ipcMain.removeHandler("chat:send")
  ipcMain.removeHandler("chat:admin:threads")
  ipcMain.removeHandler("chat:admin:messages")
  ipcMain.removeHandler("chat:admin:send")
  ipcMain.removeHandler("chat:admin:close")
}
