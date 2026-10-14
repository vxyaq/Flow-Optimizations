export interface PageFileSize {
  initialMb: number
  maximumMb: number
}

export interface RamOptions {
  ramGb: number
  keepKernel: boolean
  disableSysMain: boolean
}

export const RAM_OPTIONS = [4, 8, 16, 32, 64, 128] as const
export type RamSize = (typeof RAM_OPTIONS)[number]

const MIN_INITIAL_MB = 1024
const MAX_INITIAL_MB = 8192
const MIN_MAXIMUM_MB = 4096
const MAX_MAXIMUM_MB = 16384

export function clampRamGb(value: number): number {
  if (!Number.isFinite(value)) return 16
  return Math.min(Math.max(Math.round(value), 1), 1024)
}

export function pageFileForRam(ramGb: number): PageFileSize {
  const ram = clampRamGb(ramGb)
  const initialMb = Math.min(Math.max(ram * 128, MIN_INITIAL_MB), MAX_INITIAL_MB)
  const maximumMb = Math.min(Math.max(ram * 3072, MIN_MAXIMUM_MB), MAX_MAXIMUM_MB)
  return { initialMb, maximumMb: Math.max(maximumMb, initialMb * 2) }
}

export function nearestRamOption(totalBytes: number): RamSize {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return 16
  const gib = totalBytes / 1024 ** 3
  return RAM_OPTIONS.reduce((best, option) =>
    Math.abs(option - gib) <= Math.abs(best - gib) ? option : best,
  )
}

export function defaultRamOptions(ramGb: number): RamOptions {
  const ram = clampRamGb(ramGb)
  return { ramGb: ram, keepKernel: ram >= 16, disableSysMain: false }
}

export function formatMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`
}
