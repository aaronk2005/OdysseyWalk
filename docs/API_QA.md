# What POST /api/qa does

**POST /api/qa** is the **tour Q&A endpoint**. It answers the user’s spoken or typed question about the current stop using the tour context.

## Flow

1. **Client** (e.g. after user holds mic and asks something): sends the question text plus context to `POST /api/qa`.
2. **Request body** (JSON):
   - `questionText` (required): what the user asked.
   - `sessionId`, `poiId` (optional): for logging.
   - `context` (optional): `{ currentPoiScript, tourIntro, theme }` — the current stop’s script, tour intro, and theme so the model can answer from the tour content.
3. **Server** builds a system prompt like: “You are a friendly tour guide. Answer in 2–3 short sentences. Use only the provided context. Theme: … Tour intro: … Current stop script: …”, then calls **OpenRouter** (`openai/gpt-4o-mini`) with that system prompt and the user question.
4. **Response**: `{ answerText: "…" }` — the short answer.
5. **Client** plays `answerText` with **TTS** (Gradium or browser), so the user hears the answer.

## Dependencies

- **OPENROUTER_API_KEY** in `.env.local`. If missing, the route returns 503 and the client may show a fallback message.
- **TTS** (Gradium or browser) is used only to speak the returned `answerText`; `/api/qa` does not call TTS itself.

## Summary

| Aspect    | Detail                                                |
|----------|--------------------------------------------------------|
| Purpose  | Answer user questions about the current stop using tour context |
| Auth     | None (rate limit by IP)                               |
| Backend  | OpenRouter (GPT-4o-mini)                              |
| Input    | `questionText` + optional `context`                    |
| Output   | `answerText` (spoken by TTS on the client)             |
