import { app, ipcMain, BrowserWindow } from "electron"
import { autoUpdater, UpdateInfo } from "electron-updater"
import { platform } from "@main/utils"

const UPDATES_WINDOWS_ONLY =
  "Auto updates are only published for the Windows build of Flow Optimizations."

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!platform.windows) {
    const unavailable = () => ({ ok: false, error: UPDATES_WINDOWS_ONLY })
    ipcMain.handle("updater:get-version", () => app.getVersion())
    ipcMain.handle("updater:check", async () => unavailable())
    ipcMain.handle("updater:download", async () => unavailable())
    ipcMain.handle("updater:install", () => unavailable())
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: "github",
    owner: "vxyaq",
    repo: "Flow-Optimizations",
    releaseType: "release",
  })

  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
  }

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    const win = getMainWindow()
    win?.webContents.send("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes ?? undefined,
    })
  })

  autoUpdater.on("update-not-available", () => {
    const win = getMainWindow()
    win?.webContents.send("updater:not-available", { currentVersion: app.getVersion() })
  })

  autoUpdater.on("error", (err: Error) => {
    const win = getMainWindow()
    win?.webContents.send("updater:error", { message: String(err) })
  })

  autoUpdater.on("download-progress", (progress: any) => {
    const win = getMainWindow()
    win?.webContents.send("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    const win = getMainWindow()
    win?.webContents.send("updater:downloaded", { version: info.version })
  })

  ipcMain.handle("updater:get-version", () => app.getVersion())

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await checkForUpdatesWithTimeout()
      const info = result?.updateInfo
      return {
        ok: true,
        updateAvailable: !!result?.isUpdateAvailable,
        updateInfo: info
          ? { version: info.version, releaseNotes: info.releaseNotes ?? undefined }
          : null,
      }
    } catch (error: any) {
      return { ok: false, error: friendlyUpdateError(error) }
    }
  })

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:install", () => {
    try {
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  setTimeout(() => triggerAutoUpdateCheck(), 3000)
}

const UPDATE_CHECK_TIMEOUT_MS = 20000

let inflightUpdateCheck: Promise<Awaited<ReturnType<typeof autoUpdater.checkForUpdates>>> | null = null

function friendlyUpdateError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (/timed out|timeout/i.test(msg)) {
    return "Update check timed out. Check your internet connection and try again."
  }
  if (/404|not found|latest\.yml|no published versions/i.test(msg)) {
    return "Update feed not found on GitHub. Please try again in a moment."
  }
  if (/net::|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|getaddrinfo|socket hang up/i.test(msg)) {
    return "Couldn't reach GitHub. Check your internet connection."
  }
  if (/check ?for ?updates|in progress|already|locked/i.test(msg)) {
    return "An update check is already running. Please wait a moment."
  }
  return msg
}

async function runUpdateCheck() {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      autoUpdater.checkForUpdates(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Update check timed out.")), UPDATE_CHECK_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function checkForUpdatesWithTimeout() {
  if (!inflightUpdateCheck) {
    inflightUpdateCheck = runUpdateCheck().finally(() => {
      inflightUpdateCheck = null
    })
  }
  return inflightUpdateCheck
}

export async function triggerAutoUpdateCheck(): Promise<void> {
  if (!platform.windows) return
  try {
    await checkForUpdatesWithTimeout()
  } catch {}
}
