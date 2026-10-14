import { describe, expect, it } from "vitest"
import {
  RAM_OPTIONS,
  clampRamGb,
  defaultRamOptions,
  nearestRamOption,
  pageFileForRam,
} from "../ram"

describe("pageFileForRam", () => {
  it("follows Microsoft floor (RAM/8) with 16 GB ceiling", () => {
    expect(pageFileForRam(8)).toEqual({ initialMb: 1024, maximumMb: 16384 })
    expect(pageFileForRam(16)).toEqual({ initialMb: 2048, maximumMb: 16384 })
    expect(pageFileForRam(32)).toEqual({ initialMb: 4096, maximumMb: 16384 })
  })

  it("keeps headroom so max never touches initial", () => {
    for (const ramGb of RAM_OPTIONS) {
      const { initialMb, maximumMb } = pageFileForRam(ramGb)
      expect(maximumMb).toBeGreaterThanOrEqual(initialMb * 2)
    }
  })

  it("caps both ends so huge RAM can't eat the SSD", () => {
    expect(pageFileForRam(128).initialMb).toBe(8192)
    for (const ramGb of RAM_OPTIONS) {
      expect(pageFileForRam(ramGb).maximumMb).toBeLessThanOrEqual(16384)
    }
  })
})

describe("clampRamGb", () => {
  it("rounds and bounds", () => {
    expect(clampRamGb(15.6)).toBe(16)
    expect(clampRamGb(0)).toBe(1)
    expect(clampRamGb(99999)).toBe(1024)
    expect(clampRamGb(Number.NaN)).toBe(16)
  })
})

describe("nearestRamOption", () => {
  it("rounds ties up for headroom", () => {
    expect(nearestRamOption(16 * 1024 ** 3)).toBe(16)
    expect(nearestRamOption(12 * 1024 ** 3)).toBe(16)
    expect(nearestRamOption(24 * 1024 ** 3)).toBe(32)
  })

  it("falls back to 16 GB", () => {
    expect(nearestRamOption(0)).toBe(16)
    expect(nearestRamOption(Number.NaN)).toBe(16)
  })
})

describe("defaultRamOptions", () => {
  it("enables kernel-in-RAM only for 16 GB+", () => {
    expect(defaultRamOptions(8).keepKernel).toBe(false)
    expect(defaultRamOptions(16).keepKernel).toBe(true)
    expect(defaultRamOptions(32).keepKernel).toBe(true)
  })
})
