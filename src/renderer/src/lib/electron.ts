export function minimize() {
  window.electron.ipcRenderer.send("window-minimize")
}

export function toggleMaximize() {
  window.electron.ipcRenderer.send("window-toggle-maximize")
}

export function close() {
  window.electron.ipcRenderer.send("window-close")
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
  const pending = window.electron.ipcRenderer.invoke(channel, payload)
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
