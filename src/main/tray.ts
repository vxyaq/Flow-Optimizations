import { Tray, Menu, app, BrowserWindow } from "electron"
import { getAppIcon } from "@main/utils"

export function createTray(mainWindow: BrowserWindow): Tray {
  const tray = new Tray(getAppIcon())

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Window", click: (): void => mainWindow.show() },
    { label: "Quit", click: (): void => app.quit() },
  ])

  tray.setToolTip("Flow Optimizations")
  tray.setTitle("Flow Optimizations")
  tray.setContextMenu(contextMenu)
  tray.on("click", (): void => toggleWindowState(mainWindow))

  return tray
}

function toggleWindowState(mainWindow: BrowserWindow): void {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
  }
}
