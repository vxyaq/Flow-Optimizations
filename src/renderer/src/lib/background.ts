import { invoke } from "./electron"

export type BackgroundStyle = "image" | "image2" | "image3" | "gray"

declare global {
  interface Window {
    background?: {
      getPath: (index?: number) => Promise<string | null>
      getDataUrl: (index?: number) => Promise<string | null>
    }
  }
}

const STYLE_KEY = "flow:backgroundStyle"
const STYLE_V2_KEY = "flow:backgroundStyleV2"

export const getBackgroundStyle = (): BackgroundStyle => {
  if (!localStorage.getItem(STYLE_V2_KEY)) {
    localStorage.setItem(STYLE_KEY, "image")
    localStorage.setItem(STYLE_V2_KEY, "1")
  }
  const saved = localStorage.getItem(STYLE_KEY)
  return saved === "gray" ? "gray" : saved === "image2" ? "image2" : saved === "image3" ? "image3" : "image"
}

export const setBackgroundStyle = (style: BackgroundStyle): void => {
  localStorage.setItem(STYLE_KEY, style)
  localStorage.setItem(STYLE_V2_KEY, "1")
}

const toFileUrl = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, "/")
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`
}

export const applyPlainGray = (): void => {
  document.body.style.removeProperty("--flow-bg-image")
  document.body.classList.add("bg-gray")
  document.body.classList.remove("bg-image", "bg-none")
  resetAccent()
}

const BLUE_ACCENT = "#2563eb"

export const syncAccent = (style: BackgroundStyle): void => {
  if (style === "image3") {
    document.documentElement.style.setProperty("--color-flow-primary", BLUE_ACCENT)
    document.documentElement.style.setProperty("--color-primary", BLUE_ACCENT)
  } else {
    resetAccent()
  }
}

export const resetAccent = (): void => {
  document.documentElement.style.removeProperty("--color-flow-primary")
  document.documentElement.style.removeProperty("--color-primary")
}

export const applyBackgroundImage = async (style: BackgroundStyle = "image"): Promise<boolean> => {
  const index = style === "image2" ? 1 : style === "image3" ? 2 : 0
  try {
    let image: string | null = null
    try {
      image = (await window.background?.getDataUrl?.(index)) ?? null
    } catch {
      image = null
    }

    if (!image) {
      const bgPath =
        (await window.background?.getPath?.(index)) ??
        (await invoke({ channel: "background:get-path", payload: index }))
      if (typeof bgPath === "string" && bgPath) {
        image = toFileUrl(bgPath)
      }
    }

    if (!image) {
      applyPlainGray()
      return false
    }

    document.body.style.setProperty("--flow-bg-image", `url("${image}")`)
    document.body.classList.add("bg-image")
    document.body.classList.remove("bg-gray", "bg-none")
    syncAccent(style)
    return true
  } catch {
    applyPlainGray()
    return false
  }
}

export const loadSavedBackground = async (): Promise<void> => {
  const style = getBackgroundStyle()
  if (style === "image" || style === "image2" || style === "image3") {
    await applyBackgroundImage(style)
  } else {
    applyPlainGray()
  }
}
