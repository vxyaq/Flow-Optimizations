# 🎮 Flow Optimizations - Game Optimizations

## 📁 Structure

This folder contains **32+ game-specific optimizations** for the Games tab in Flow Optimizations.

Each game folder contains:
- **meta.json** - Game metadata (id, title, description, markers, background)
- **apply.ps1** - PowerShell optimization script
- **unapply.ps1** - Revert script (sets process priority back to Normal)
- **[game]-background.webp** - Background image for the game card (1920x1080 recommended)

---

## 🎯 Complete Game List (32+ games)

### Battle Royale / FPS Shooters:
1. **Fortnite** ✅ Complete
2. **Apex Legends** ✅ Complete
3. **Call of Duty: Warzone** ✅ Complete
4. **PUBG**
5. **Valorant** ✅ Complete
6. **CS2 (Counter-Strike 2)** ✅ Complete
7. **Overwatch 2** ✅ Complete
8. **Rainbow Six Siege**
9. **Battlefield 2042**
10. **Escape from Tarkov**
11. **Hunt: Showdown**
12. **Hell Let Loose**

### MOBA / Strategy:
13. **League of Legends** ✅ Complete
14. **Dota 2**

### Racing:
15. **Forza Horizon 5**
16. **Gran Turismo 7** (if applicable)

### Open World / RPG:
17. **GTA V**
18. **Red Dead Redemption 2**
19. **Cyberpunk 2077**
20. **The Witcher 3**
21. **Elden Ring**
22. **Dark Souls 3**
23. **Spider-Man Remastered**
24. **Hogwarts Legacy**

### Sports:
25. **FIFA 24 / EA SPORTS FC 24**
26. **NBA 2K24**
27. **Rocket League**

### Survival / Crafting:
28. **Minecraft**
29. **Rust**
30. **Satisfactory**
31. **Palworld**

### Other:
32. **Roblox**
33. **Warframe**
34. **Destiny 2**

---

## ⚡ What Each Optimization Does

All optimizations include:
1. **Process Priority** - Sets game process to High priority
2. **GPU Preference** - Forces GPU to use high-performance mode
3. **Disable GameDVR** - Disables Xbox Game Bar overlay
4. **Disable GameBar** - Removes Windows gaming overlay
5. **Game-Specific Config** - Optimizes in-game settings files (if available)

### Game-Specific Optimizations:

**CS2:**
- Optimizes video settings (low latency 2, MSAA off, shadows low)
- Sets r_player_visibility_mode for better FPS

**Fortnite:**
- Disables VSync
- Sets frame rate limit to 240
- Lowers all quality settings for maximum FPS

**Valorant:**
- Process priority boost
- GPU affinity optimization
- Low-latency mode

**League of Legends:**
- Disables HUD animations
- Optimizes frame cap settings

**Apex Legends:**
- Particle effects reduction
- VSync disabled
- Gib system disabled for performance

**Call of Duty: Warzone:**
- Video memory scale optimization
- Threaded optimization enabled
- Render worker count optimization

---

## 📊 Status

**Created:** 32+ games  
**With Scripts:** 32+ (apply.ps1 + unapply.ps1)  
**With Meta:** 32+ (meta.json)  
**With Backgrounds:** Placeholders created, actual images TBD

---

## 🔧 Adding New Games

To add a new game:

1. Create folder: `tweaks/games/game-name/`
2. Add `meta.json`:
```json
{
  "id": "game-name",
  "title": "Game Title",
  "background": "game-name-background.webp",
  "description": "Detailed optimization description",
  "notRunningMarker": "GAME_NOT_RUNNING",
  "notRunningText": "Launch Game and click again.",
  "successText": "Game FPS boost applied!"
}
```

3. Add `apply.ps1` with optimization script
4. Add `unapply.ps1` with revert script
5. Add `game-name-background.webp` (1920x1080 recommended)

---

## 🎨 Background Images

Background images should be:
- **Format:** WebP (optimized for web)
- **Resolution:** 1920x1080 or 1280x720
- **Size:** <500KB recommended
- **Content:** Game screenshot, logo, or artwork

Place backgrounds in `src/renderer/src/assets/` and import in `Games.tsx`.

---

**Total Games:** 32+  
**Location:** `tweaks/games/`  
**Tab:** Games (not Tweaks)
