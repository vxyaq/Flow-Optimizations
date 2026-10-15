import type { BrowserWindow } from "electron"

export const logo = "[Flow Optimizations]:"

export let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}
