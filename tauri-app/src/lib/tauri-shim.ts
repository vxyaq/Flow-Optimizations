import { invoke as tauriInvoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

type Listener = (event: unknown, ...args: unknown[]) => void

const unlistens = new Map<string, UnlistenFn[]>();

async function addListener(channel: string, listener: Listener): Promise<void> {
  const unlisten = await listen(channel, (event) => {
    listener(null, event.payload)
  })
  const list = unlistens.get(channel) ?? []
  list.push(unlisten)
  unlistens.set(channel, list)
}

function removeListener(channel: string, _listener?: Listener): void {
  const list = unlistens.get(channel)
  if (!list || list.length === 0) return
  const unlisten = list.pop()
  if (unlisten) void unlisten()
  if (list.length === 0) unlistens.delete(channel)
  else unlistens.set(channel, list)
}

function removeAllListeners(channel: string): void {
  const list = unlistens.get(channel)
  if (!list) return
  for (const unlisten of list) void unlisten()
  unlistens.delete(channel)
}

export function installTauriShim(): void {
  (window as any).electron = {
    ipcRenderer: {
      invoke: (channel: string, payload?: unknown) =>
        tauriInvoke("dispatch", { channel, payload: payload ?? null }),
      send: (channel: string, payload?: unknown) => {
        void tauriInvoke("dispatch", { channel, payload: payload ?? null })
      },
      on: (channel: string, listener: Listener) => {
        void addListener(channel, listener)
      },
      removeListener: (channel: string, listener?: Listener) => {
        removeListener(channel, listener)
      },
      removeAllListeners: (channel: string) => {
        removeAllListeners(channel)
      },
    },
  }
}
