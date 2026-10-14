import { invoke as tauriInvoke } from "@tauri-apps/api/core"

export function minimize() {
  void tauriInvoke("dispatch", { channel: "window-minimize", payload: null })
}

export function toggleMaximize() {
  void tauriInvoke("dispatch", { channel: "window-toggle-maximize", payload: null })
}

export function close() {
  void tauriInvoke("dispatch", { channel: "window-close", payload: null })
}

export async function invoke({
  channel,
  payload,
  timeoutMs,
}: {
  channel: string
  payload?: any
  timeoutMs?: number
}): Promise<any> {
  const pending = tauriInvoke("dispatch", { channel, payload: payload ?? null })
  if (!timeoutMs || timeoutMs <= 0) return pending
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Request timed out (${channel}).`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
