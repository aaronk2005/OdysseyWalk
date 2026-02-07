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

**No Gradium package to install.** The [Gradium API docs](https://gradium.ai/api_docs.html) show `pip install gradium` for the **Python** SDK. This app is Node/Next.js: we call the same Gradium HTTP and WebSocket API directly (using the `ws` package and `fetch`). You only need the API key and URLs in `.env.local`.

Use a **Gradium** API key from [gradium.ai](https://gradium.ai). Keys start with **`gd_`** or **`gsk_`**. Keys like `sk-or-v1-` are OpenRouter and will not work (you will hear browser/Google TTS instead).

1. **Get a Gradium API key**  
   Sign up at [gradium.ai](https://gradium.ai) and create an API key. Keys look like **`gd_...`** or **`gsk_...`**.

2. **Set these in `.env.local`** (server-only; do not commit):

   **You only enter the API key once.** The app reads `GRADIUM_API_KEY` from `.env.local` and uses it for both TTS and STT; you do not paste it into the code or into multiple env vars.

   **For Gradium voices (not browser TTS), set the WebSocket URL:**
   ```bash
   GRADIUM_API_KEY=gd_or_gsk_your_actual_key_here
   GRADIUM_TTS_WS_URL=wss://us.api.gradium.ai/api/speech/tts
   ```
   - **wss vs https:** Use **two different env vars**. **WebSocket** = `GRADIUM_TTS_WS_URL` with **`wss://`** (e.g. `wss://us.api.gradium.ai/api/speech/tts`). **POST** = `GRADIUM_TTS_URL` with **`https://`** (e.g. `https://us.api.gradium.ai/api/post/speech/tts`). Don’t put a wss URL in `GRADIUM_TTS_URL` — the app uses that for `fetch()` (POST).
   - **Region (eu vs us):** Gradium has **EU** and **US** regions. Use **`us`** if you’re in North America (e.g. Canada) for lower latency; use **`eu`** for Europe. Same host pattern: `wss://us.api.gradium.ai/...` or `wss://eu.api.gradium.ai/...`, and `https://us.api.gradium.ai/...` or `https://eu.api.gradium.ai/...` for POST.
   - **TTS WebSocket** (recommended): `GRADIUM_TTS_WS_URL=wss://us.api.gradium.ai/api/speech/tts` (or `eu` if you prefer).
   - **TTS POST** (alternative): `GRADIUM_TTS_URL=https://us.api.gradium.ai/api/post/speech/tts` — must be **https** and path must include **`/post/`**. Auth: `x-api-key` only ([Gradium API](https://gradium.ai/api_docs.html)).
   - **STT**: Gradium STT is **WebSocket-only** (`wss://us.api.gradium.ai/api/speech/asr` or `eu`). The app does not implement the STT WebSocket client; leave `GRADIUM_STT_URL` unset to use the browser SpeechRecognition fallback.
   - If both TTS URLs are set, the app uses **WebSocket** for TTS.
   - **Concurrency:** Gradium allows only **2 concurrent TTS sessions** per API key. The app queues requests so you don’t see “Concurrency limit exceeded”; extra requests wait until a slot is free.

3. **Restart the dev server** after changing `.env.local`.  
   Next.js reads env at startup. If you see “STT is not configured”, it usually means the server was not restarted after adding or changing `GRADIUM_*` variables.

4. **Check which TTS is used** — Call `GET /api/health`; response includes `gradiumTtsMethod`: `"websocket"` or `"post"`. Config:  
   - **TTS** uses Gradium when `GRADIUM_API_KEY` is set and either `GRADIUM_TTS_WS_URL` (WebSocket) or `GRADIUM_TTS_URL` (POST) is set.  
   - **STT**: Gradium STT is WebSocket-only in the API docs; the app uses browser fallback unless you point `GRADIUM_STT_URL` at a REST STT endpoint.  
   You can set only TTS (and leave `GRADIUM_STT_URL` unset); the app will then use the browser’s SpeechRecognition for STT.

---

## Quick checklist

- [ ] `GRADIUM_API_KEY` from [gradium.ai](https://gradium.ai) (**gd_** or **gsk_**; not sk-or-)
- [ ] **Gradium voices:** set `GRADIUM_TTS_WS_URL=wss://us.api.gradium.ai/api/speech/tts` (or `eu`). Use **wss** in **GRADIUM_TTS_WS_URL** only.
- [ ] If using POST only: `GRADIUM_TTS_URL=https://us.api.gradium.ai/api/post/speech/tts` (must be **https** and include `/post/`)
- [ ] Restarted the Next.js dev server after editing `.env.local`
- [ ] For TTS to play: press **Start Walk** first, then use **Play** to resume if needed

**Still not working?** Open **http://localhost:3000/api/tts/status** (or :3001) and check `env.hasKey`, `env.hasWsUrl`, `gradiumTtsMethod`. In the **terminal** where `npm run dev` runs, look for `[TTS] WebSocket failed: ...`. In **browser DevTools → Console**, look for `[TTS] Server returned 502/503 ...`.

**Hearing browser/Google voice?** Either Gradium isn’t configured (check `/api/health` and `gradiumTtsMethod`), or the API key is wrong (use a key from gradium.ai), or the server wasn’t restarted after changing `.env.local`.
