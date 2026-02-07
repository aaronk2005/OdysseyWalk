# Odyssey Walk — Demo Day Checklist

**Use this checklist 10 minutes before judging to ensure everything works.**

---

## Pre-Demo Setup (5 minutes)

- [ ] **Open terminal** and navigate to project directory
- [ ] **Pull latest** from `main` branch: `git pull origin main`
- [ ] **Install dependencies** (if needed): `npm install`
- [ ] **Start dev server**: `npm run dev`
- [ ] **Open browser** to `http://localhost:3000` (or deployed URL)

---

## Env Var Check (1 minute)

- [ ] Open `http://localhost:3000/api/health`
- [ ] Verify response shows:
  ```json
  {
    "ok": true,
    "mapsKeyPresent": true,
    "openRouterConfigured": true,
    "gradiumConfigured": true
  }
  ```
- [ ] **If any `false`**: check `.env.local` and restart server
- [ ] **Fallback mode**: If Gradium is `false`, typed questions + text answers will be used (acceptable)

---

## Quick Smoke Test (4 minutes)

### 1. Landing Page

- [ ] Open `/` → hero loads with "Create Tour" button
- [ ] Click "Create Tour" → navigate to `/create`

### 2. Tour Generation

- [ ] On `/create`:
  - [ ] Map loads (if key present; else placeholder shows)
  - [ ] Click map → green pin appears with "Dropped pin" label
  - [ ] OR search "Union Square SF" → autocomplete works → pin moves
  - [ ] Select theme "history", duration 30min, voice "friendly"
  - [ ] Click "Generate My Tour" → spinner shows
  - [ ] **Wait 3-8 seconds**
  - [ ] Route polyline + 5-8 blue markers appear
  - [ ] Click "Start Walk" → navigate to `/tour/active`

### 3. Active Tour (Demo Mode)

- [ ] On `/tour/active`:
  - [ ] Map shows route + POI markers
  - [ ] "Start Walk" button visible at bottom
  - [ ] Click "Start Walk" → intro narration plays (or text shows if TTS unavailable)
  - [ ] Demo mode banner appears (if permission denied or default demo mode)
  - [ ] Click "Next stop" → teleport to POI 1 → narration plays
  - [ ] Bottom sheet shows "Stop 1 of X" + current POI name
  - [ ] Audio progress indicator visible

### 4. Q&A Flow

- [ ] **Press and hold** mic button in bottom sheet
  - [ ] "Listening..." state appears
  - [ ] **Release** after 2 seconds
  - [ ] "Thinking..." state appears
  - [ ] Answer text appears + TTS plays (or text-only if TTS unavailable)
- [ ] **Fallback test** (if STT unavailable):
  - [ ] Typed question modal appears instead of "Listening..."
  - [ ] Type "When was this built?" → submit
  - [ ] Answer appears + plays

### 5. Completion

- [ ] Click "Next stop" repeatedly until last POI
- [ ] After last POI:
  - [ ] Outro narration plays
  - [ ] Navigate to `/tour/complete`
  - [ ] Summary shows: stops visited, approx. time
  - [ ] "Generate Another" button visible

### 6. Scripted Demo (Fallback Test)

- [ ] Open `/demo`
- [ ] Click "Run 90s Demo"
- [ ] See progress: "Playing stop 1..." → "Sample Q&A..." → "Playing stop 2..." → "Done."
- [ ] **Total time**: ~30-60 seconds (not full 90s in dev)
- [ ] No errors in console

---

## Common Issues & Quick Fixes

### Map doesn't load
- **Cause**: Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Fix**: Add key to `.env.local` → restart server
- **Workaround**: Tour still works with text-only mode; generate + narration functional

### "Generate Tour" fails
- **Cause**: Missing `OPENROUTER_API_KEY` or rate limit
- **Fix**: Check `/api/health` → add key → restart
- **Workaround**: Use fallback tour (should auto-load)

### TTS doesn't play
- **Cause**: Missing `GRADIUM_API_KEY` or Gradium API down
- **Fix**: Check `/api/health` → add key → restart
- **Workaround**: Text answer displays (acceptable); demo still works

### STT doesn't work
- **Cause**: Missing `GRADIUM_API_KEY` or mic permission denied
- **Fix**: Grant mic permission OR use typed question modal
- **Workaround**: Typed questions work fine for demo

### Console errors on mobile
- **Cause**: Framer Motion animations or map resize
- **Fix**: Refresh page
- **Workaround**: Use desktop viewport for judging

---

## Demo Script (30 seconds)

**Use this script when presenting to judges:**

1. **Start**: "I'll show you Odyssey Walk, a voice-first walking tour app."
2. **Create**: "I'll select a start location—let's use Union Square—and choose a history theme. Click Generate Tour."
3. **Wait**: "The app calls OpenRouter to generate a route with 5-8 stops and narration scripts."
4. **Show map**: "Here's our route with markers. Let's start the walk."
5. **Play intro**: "The intro narration plays automatically."
6. **Jump POI**: "In demo mode, I can jump to the next stop. The app detects when I reach a POI and plays narration."
7. **Ask question**: "I can press and hold the mic to ask a question. The app transcribes it, sends to the LLM, and speaks the answer back."
8. **Complete**: "After the last stop, we see a summary with visited stops and completion time."
9. **Fallback**: "If voice isn't available, the app gracefully falls back to typed questions and text answers."

---

## Final Checks (1 minute before judging)

- [ ] Close all other browser tabs
- [ ] Clear browser console (`Cmd+K` / `Ctrl+L`)
- [ ] Reload app on landing page: `http://localhost:3000`
- [ ] Check volume is ON
- [ ] Check internet connection stable
- [ ] Have backup plan: if live demo fails, show `/demo` scripted run

---

## Emergency Fallback

If **everything breaks**:
1. Open `/demo`
2. Click "Run 90s Demo"
3. Explain: "This is our scripted demo that runs without any API keys."
4. Show code in editor (backup)

**Good luck!** 🚀
