# Implementation Plan

## Overview
This plan addresses bugs, performance optimizations, and security/DevTools blocking in the K3d Tweaks Tauri/React application. All changes must leave the codebase in a buildable state after each step.

**Build Command**: `pnpm run build` (runs TypeScript check + Vite build)  
**Test Command**: `pnpm run dev` (launch dev server to verify changes)  
**Project**: Tauri 2.x + React 19 + Vite + TypeScript

---

## Critical Bug Fixes

- [ ] 1. Fix `requestIdleCallback` polyfill timing issue in Home.tsx (line 85)
      
      **Problem**: The error "Can't find variable: requestIdleCallback" at Home.tsx:125 suggests the polyfill in index.html may not execute before React hydrates, or WebKit may have a race condition.
      
      **Solution**: Add defensive checks directly in Home.tsx where `requestIdleCallback` is used. Wrap all three `useEffect` calls (lines 85, 115, 143) with a fallback to `setTimeout` if `requestIdleCallback` is undefined at runtime.
      
      **Files**: 
      - `src/pages/Home.tsx`
      
      **Changes**:
      - In each of the three `useEffect` blocks that call `requestIdleCallback`, replace:
        ```tsx
        const idleHandle = requestIdleCallback(() => { ... })
        return () => cancelIdleCallback(idleHandle)
        ```
        with:
        ```tsx
        const scheduleIdle = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : setTimeout
        const cancelIdle = typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : clearTimeout
        const idleHandle = scheduleIdle(() => { ... })
        return () => cancelIdle(idleHandle)
        ```
      - This ensures the code gracefully degrades if the polyfill hasn't loaded yet.
      
      **Verify**: Run `pnpm run dev`, open the app, navigate to Home page, check browser console for errors. The `requestIdleCallback` error should be gone.

- [ ] 2. Fix Discord login — remove leftover console.log/error statements in authScreen.tsx
      
      **Problem**: authScreen.tsx lines 58-59 have `console.log('Auth result:', result)` and line 63 has `console.error('Auth error:', error)` that should be removed per the requirements. (Note: verified these lines were already removed in the current file, so this step confirms they are gone.)
      
      **Files**:
      - `src/components/authScreen.tsx`
      
      **Changes**:
      - Verify lines 58-59 do NOT contain `console.log('Auth result:', result)`
      - Verify line 63 does NOT contain `console.error('Auth error:', error)`
      - If present, remove both statements entirely (not replace with toast — already have toast on lines 57, 60, 62).
      
      **Verify**: Search the file for `console.` — should return zero matches. Run `pnpm run build` and confirm no TypeScript errors.

- [ ] 3. Fix background-change bug in Settings.tsx
      
      **Problem**: Settings.tsx `handleBackgroundChange` function (line 86) dispatches `'background:changed'` event, and App.tsx listens for it (line 56-61), but the implementation may not correctly apply the background. The `console.log` statements in handleBackgroundChange must also be removed.
      
      **Files**:
      - `src/pages/Settings.tsx`
      
      **Changes**:
      - Line 86-104: in `handleBackgroundChange`, verify the event dispatch is `window.dispatchEvent(new CustomEvent('background:changed', { detail: { style } }))` (currently line 101).
      - The function already calls `persistBackgroundStyle(style)`, `applyPlainGray()` or `applyBackgroundImage(style)`, and dispatches the event. No logic bug found.
      - **Remove the two console.log statements** if any remain (search for `console.log` in Settings.tsx — currently none found in the read excerpt, but double-check the whole file).
      
      **Verify**: Run `pnpm run dev`, go to Settings, change background style, confirm the background updates visually. Check that `src/lib/background.ts` `loadSavedBackground` is called by App.tsx listener and applies the change.

---

## DevTools & Security Hardening

- [ ] 4. Complete DevTools blocking in index.html — add missing Ctrl+Shift+I verification and block Ctrl+S
      
      **Problem**: index.html (lines 18-28) blocks F12, Ctrl+Shift+I/C/J/K, Ctrl+U, Ctrl+S, and Meta+Alt variants, but needs verification that uppercase 'I' in Ctrl+Shift+I is covered (it is: line 19 has `(e.key === 'I' || e.key === 'i')`). Also, Ctrl+S is already blocked on line 20. The user wants to ensure ALL DevTools access is blocked.
      
      **Files**:
      - `index.html`
      
      **Changes**:
      - Lines 18-28: verify the keydown listener blocks:
        - `F12` ✓ (line 18)
        - `Ctrl+Shift+I` (uppercase and lowercase) ✓ (line 19)
        - `Ctrl+Shift+C` ✓ (line 20)
        - `Ctrl+Shift+J` ✓ (line 21)
        - `Ctrl+Shift+K` ✓ (line 22)
        - `Ctrl+U` ✓ (line 23)
        - `Ctrl+S` ✓ (line 24)
        - macOS variants: `Meta+Alt+I/C/J` ✓ (lines 25-27)
      - All combinations are present and correct. No changes needed unless the user reports a specific bypass.
      
      **Verify**: Run `pnpm run dev`, try F12, Ctrl+Shift+I (both cases), right-click context menu, Ctrl+S — all should be blocked. Open DevTools manually via IDE/browser menu to confirm the app blocks the shortcuts correctly.

- [ ] 5. Remove ALL console.log/warn/error/debug calls from .tsx files in src/
      
      **Problem**: Multiple files in src/ have direct `console.error` calls (Home.tsx removed console.warn at line 133 already). Tweaks.tsx has `console.error` at lines 193, 210, 224, 282, 302, 346, 411, 472, 707, 709. These must be removed.
      
      **Files**:
      - `src/pages/Tweaks.tsx`
      - Any other .tsx files with console.* calls (grep found only Tweaks.tsx and main.tsx; main.tsx already stubs console in production at lines 31-35)
      
      **Changes**:
      - `src/pages/Tweaks.tsx`:
        - Line 193: remove `console.error("Error fetching tweaks:", error)` (keep the `log.error` on line 195)
        - Line 210: remove `console.error("Error loading toggle states:", error)` (keep `log.error` on line 212)
        - Line 224: remove `console.error("Error saving toggle states:", error)` (keep `log.error` on line 226)
        - Line 282: remove `console.error(\`Error toggling tweak \${tweak.title}:\`, error)` (keep `log.error` on line 284)
        - Line 302: remove `console.error("Error reverting toggle state:", err)` (keep `log.error` on line 304)
        - Line 346: remove `console.error(\`Error applying tweak \${tweak.title}:\`, error)` (keep `log.error` on line 348)
        - Line 411: remove `console.error(\`Error reapplying tweak \${tweak.title}:\`, error)` (keep `log.error` on line 413)
        - Line 472: remove `console.error(\`Error applying tweak \${tweak.title}:\`, error)` (keep `log.error` on line 474)
        - Line 707: remove `console.error(\`Error applying tweak \${selectedTweak.title}:\`, error)` (keep `log.error` on line 709)
      - Note: `log.error` statements use `src/lib/log.ts`, which already no-ops in production (`import.meta.env.PROD ? noop : console.error`), so they are safe to keep.
      
      **Verify**: Run `grep -rn "console\." src/ --include="*.tsx"` and confirm only `src/main.tsx` lines 31-35 (the stub) remain. Run `pnpm run build` and check for no errors.

- [ ] 6. Stub out src/lib/log.ts for production builds
      
      **Problem**: `log.ts` already uses `import.meta.env.PROD` to no-op in production. Verify this is sufficient.
      
      **Files**:
      - `src/lib/log.ts`
      
      **Changes**:
      - Lines 4-8: confirm the pattern `import.meta.env.PROD ? noop : (...args) => console.log(...args)` for `info`, `log`, `warn`, `error`, `debug`.
      - This is correct for Vite (import.meta.env.PROD is true in production builds).
      - **No changes needed** — this already works as intended.
      
      **Verify**: Run `pnpm run build`, then inspect the output bundle (`dist/assets/*.js`) and confirm no `console.log` or `console.error` strings appear (they should be tree-shaken out by the `noop` branches).

---

## Code Cleanup

- [ ] 7. Remove ALL code comments from .tsx/.ts files in src/ (except import statements, keep JSDoc on exported interfaces)
      
      **Problem**: User wants all comments removed to prevent code copying. Found comments in:
      - `src/App.tsx` line 28: `// Preload components after initial render`
      - `src/App.tsx` line 56: `// Listen for background changes`
      - `src/App.tsx` line 205: `// Preload components after authentication`
      - `src/components/rootdiv.tsx` line 80: `// Memoize to prevent unnecessary re-renders`
      
      **Files**:
      - `src/App.tsx`
      - `src/components/rootdiv.tsx`
      - Any other .tsx/.ts files with `//` or `/* */` comments (excluding import lines and JSDoc `/** */` on exported types/interfaces)
      
      **Changes**:
      - `src/App.tsx`:
        - Remove line 28: `// Preload components after initial render`
        - Remove line 56: `// Listen for background changes`
        - Remove line 205: `// Preload components after authentication`
      - `src/components/rootdiv.tsx`:
        - Remove line 80: `// Memoize to prevent unnecessary re-renders`
      - Run `grep -rn "^\s*//" src/ --include="*.tsx" --include="*.ts"` to find all line comments, then manually review and remove all non-import-related comments.
      - Run `grep -rn "/\*" src/ --include="*.tsx" --include="*.ts"` to find block comments (excluding JSDoc `/**`), remove those too.
      
      **Verify**: Run `grep -rn "^\s*//" src/ --include="*.tsx"` and `grep -rn "/\*[^*]" src/ --include="*.tsx"` — should return zero non-JSDoc matches. Run `pnpm run build` to confirm no syntax errors.

---

## Performance Optimizations

- [ ] 8. Lazy-load Home component in App.tsx
      
      **Problem**: App.tsx line 14 imports `Home` directly, but all other routes (Tweaks, Clean, Games, Settings, Account, Backup) are lazy-loaded (lines 16-21). This causes Home to bundle with the main chunk, increasing initial load time.
      
      **Files**:
      - `src/App.tsx`
      
      **Changes**:
      - Line 14: replace `import Home from "./pages/Home"` with `const Home = lazy(() => import("./pages/Home"))`
      - Line 229: the `<Route path="/" element={<Home />} />` is already inside the `<Suspense>` block, so no additional wrapping needed.
      
      **Verify**: Run `pnpm run build`, inspect `dist/assets/` and confirm Home.tsx is split into a separate chunk (e.g., `Home-abc123.js`). Run `pnpm run dev`, open app, check Network tab — Home should load on-demand when navigating to `/`.

- [ ] 9. Fix preloadComponents in App.tsx to include all lazy routes
      
      **Problem**: `preloadComponents` function (lines 30-35) only preloads Tweaks, Settings, Backup. It does NOT preload Clean, Games, or Account. This causes lag when switching to those tabs for the first time.
      
      **Files**:
      - `src/App.tsx`
      
      **Changes**:
      - Lines 30-35: add `import("./pages/Clean")`, `import("./pages/Games")`, `import("./pages/Account")` to the `requestIdleCallback` block.
      - After change, the function should look like:
        ```tsx
        const preloadComponents = () => {
          requestIdleCallback(() => {
            import("./pages/Tweaks")
            import("./pages/Settings")
            import("./pages/Backup")
            import("./pages/Clean")
            import("./pages/Games")
            import("./pages/Account")
          }, { timeout: 2000 })
        }
        ```
      
      **Verify**: Run `pnpm run dev`, log in, wait a few seconds (preload fires after auth), then navigate to Clean/Games/Account tabs — they should load instantly (no spinner), confirming the chunks were prefetched.

- [ ] 10. Move greeting arrays outside component in greeting.tsx
      
      **Problem**: `generalGreetings` array (line 23) and `timeGreetings` function (line 35) are declared inside the `Greeting` component body, so they are recreated on every render. This is wasteful.
      
      **Files**:
      - `src/components/greeting.tsx`
      
      **Changes**:
      - Move `const generalGreetings = [...]` (lines 23-34) to the top of the file, OUTSIDE the `Greeting` function (e.g., after imports, before `function Greeting()`).
      - Move `const timeGreetings = () => { ... }` (lines 36-40) to the top of the file as well.
      - Inside `Greeting`, the `randomGreeting` useMemo (line 42) already references these — no changes needed to that logic.
      
      **Verify**: Run `pnpm run dev`, navigate to Home, confirm the greeting renders correctly. Check React DevTools Profiler — the Greeting component should have fewer re-renders and no new array allocations on each render.

- [ ] 11. Deduplicate getStoredAnimation call in rootdiv.tsx
      
      **Problem**: `getStoredAnimation` is called twice: once in `useState` initializer (line 26) and once in `useEffect` (line 30). This is redundant — the initializer already runs once, and the effect re-reads it unnecessarily.
      
      **Files**:
      - `src/components/rootdiv.tsx`
      
      **Changes**:
      - Line 26: keep `const [style, setStyle] = useState(() => getInitialStyle(getStoredAnimation()))`
      - Line 30-31: in the `useEffect`, change `const animationMode = getStoredAnimation()` to reuse a stored value OR accept that the effect runs once per mount and the double-call is negligible. 
      - **Better solution**: hoist the `animationMode` into a `useMemo` or initialize it once in a `const` outside `useState`, then reuse it:
        ```tsx
        const animationMode = useMemo(() => getStoredAnimation(), [])
        const [style, setStyle] = useState(() => getInitialStyle(animationMode))
        ```
        Then in `useEffect`, use `animationMode` directly instead of calling `getStoredAnimation()` again.
      
      **Verify**: Run `pnpm run dev`, navigate between pages with animation enabled, confirm animations still work. Add a `console.log` inside `getStoredAnimation` temporarily, check it's called only once per component mount (remove console.log after verification).

- [ ] 12. Verify isTweakCompatible stability in Tweaks.tsx (potential useMemo issue)
      
      **Problem**: `isTweakCompatible` is defined as an inline function (line 59) and used inside `tweakMeta` useMemo (line 512). It calls `useSystemStore` via closure, which might cause unnecessary recalculations if the store reference changes.
      
      **Files**:
      - `src/pages/Tweaks.tsx`
      
      **Changes**:
      - Line 59: `isTweakCompatible` already closes over `systemInfo`, `biosFacts`, `isPro` — all stable or derived from state.
      - The `tweakMeta` useMemo (line 512) has dependencies `[tweaks, systemInfo, biosFacts, isPro]` — this is correct.
      - **No change needed** — the function is stable as long as deps don't change. If perf issues persist, consider memoizing `isTweakCompatible` with `useCallback`, but given the deps are already tracked, this is low priority.
      
      **Verify**: Open Tweaks page, check React DevTools Profiler — if `tweakMeta` recalculates unnecessarily (e.g., on every render despite no dep changes), wrap `isTweakCompatible` in `useCallback`. Otherwise, leave as-is.

---

## Window Border Radius (Note Only)

- [ ] 13. Window border-radius — investigate Tauri config (out of scope for this plan)
      
      **Problem**: `App.css` line 218 sets `#root { border-radius: 12px; overflow: hidden; }`, but on the OS level, the Tauri window may still have square corners if the window is decorated. For true rounded corners, Tauri config needs `decorations: false` and `transparent: true` in `src-tauri/tauri.conf.json`.
      
      **Files**:
      - `src/App.css` (already has the CSS)
      - `src-tauri/tauri.conf.json` (NOT modified in this plan)
      
      **Changes**:
      - **No code changes in this plan**. Document the requirement: to see OS-level rounded corners, the Tauri config must have:
        ```json
        "window": {
          "decorations": false,
          "transparent": true,
          ...
        }
        ```
      - This is a cosmetic change and may affect window drag behavior (needs custom titlebar, which the app already has via `TitleBar` component).
      
      **Verify**: If the user wants to enable this, they should:
      1. Edit `src-tauri/tauri.conf.json` to set `decorations: false` and `transparent: true`.
      2. Run `pnpm run tauri dev` and confirm the window has rounded corners at the OS level.
      3. Test window dragging via the TitleBar component to ensure it still works.
      
      **Note**: This step is informational only — implementation is deferred to a future task or manual user action.

---

## Summary

**Total Steps**: 13 (12 actionable + 1 informational note)

**Execution Order**:
1. Critical bug fixes (steps 1-3) — fix runtime errors first
2. Security hardening (steps 4-6) — block DevTools, remove console logs
3. Code cleanup (step 7) — remove comments
4. Performance optimizations (steps 8-12) — lazy loading, reduce re-renders
5. Window styling note (step 13) — document Tauri config requirement

**Build Verification**: After each step, run `pnpm run build` to ensure TypeScript compiles cleanly. After steps 1, 8, 9, run `pnpm run dev` to test runtime behavior.

**Final Verification**: Run `pnpm run build`, then `pnpm run tauri dev`, navigate through all pages (Home, Tweaks, Clean, Games, Settings, Account, Backup), confirm:
- No console errors
- DevTools shortcuts blocked
- Background changes apply immediately
- Tab switching is smooth (no lag)
- All features work as before
