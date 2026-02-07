# TTS & STT setup and what gets played

## What text the TTS actually plays

The app uses **one** TTS pipeline for all narration. The text comes from the **current tour session** (from `/api/tour/generate`), not from the generated text file.

| When | What text is played | Source |
|------|----------------------|--------|
| **Start Walk** (first button tap) | Welcome / intro | `session.tourPlan.intro` |
| **Each stop** (when you arrive at a POI or tap it or say “next”) | That stop’s narration (90–140 words) | `poi.script` for that POI |
| **Last stop** (after the final POI) | Closing / goodbye | `session.tourPlan.outro` |
| **Hold mic → ask a question** | Answer from the tour Q&A | Generated answer text |

- **Intro** is played once when you press **Start Walk** on the active tour page.
- **Stop narration** is played when a stop becomes active (geo trigger, or tapping a POI, or **Skip next** / **Say next to continue**).
- The **Play** button in the bottom sheet only **resumes** already loaded audio; it does not start the intro or a stop. If nothing was loaded (e.g. TTS failed), Play has nothing to resume and you hear nothing.

So if you “press Play” and hear nothing, either:
1. You haven’t pressed **Start Walk** yet (so intro was never requested), or  
2. TTS failed (e.g. wrong API key or Gradium down), so no audio was loaded and the app may fall back to a placeholder (if present) or silence.

---

## .env.local for Gradium (TTS + STT)

Use a **Gradium** API key and base URLs. Other providers (e.g. keys starting with `gsk_`) are not compatible.

1. **Get a Gradium API key**  
   Sign up at [gradium.ai](https://gradium.ai) and create an API key. Keys should look like **`gd_...`** (not `gsk_...`).

2. **Set these in `.env.local`** (server-only; do not commit):

   ```bash
   GRADIUM_API_KEY=gd_your_actual_key_here
   GRADIUM_TTS_URL=https://eu.api.gradium.ai/api/speech/tts
   GRADIUM_STT_URL=https://eu.api.gradium.ai/api/speech/stt
   ```

3. **Restart the dev server** after changing `.env.local`.  
   Next.js reads env at startup. If you see “STT is not configured”, it usually means the server was not restarted after adding or changing `GRADIUM_*` variables.

4. **Config check**  
   The app considers Gradium “configured” only when **all three** are non-empty:  
   `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL`.  
   If any is missing or empty, both TTS and STT are treated as not configured (e.g. STT returns 503 “STT not configured”).

---

## Quick checklist

- [ ] `GRADIUM_API_KEY` is from [gradium.ai](https://gradium.ai), format **gd_...**
- [ ] `GRADIUM_TTS_URL` and `GRADIUM_STT_URL` are set (e.g. `https://eu.api.gradium.ai/api/speech/tts` and `.../stt`)
- [ ] Restarted the Next.js dev server after editing `.env.local`
- [ ] For TTS to play: press **Start Walk** first, then use **Play** to resume if needed
