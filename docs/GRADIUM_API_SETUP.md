# Gradium API Setup Guide

This guide will help you get your Gradium API keys working with the WebSocket TTS implementation.

---

## Quick Start: Getting Your Gradium API Key

### Step 1: Get Your API Key

There are two ways to get a Gradium API key:

#### Option A: Standard Gradium Account (Recommended)
1. Visit **https://gradium.ai**
2. Sign up for an account
3. Go to your dashboard/API section
4. Create a new API key
5. Your key will start with `gd_` (e.g., `gd_abc123...`)

#### Option B: Competition Key
1. Check your competition email/portal
2. Look for a Gradium API key (starts with `gsk_`)
3. Check for competition-specific documentation
4. **Important:** Competition keys may use different endpoints!

---

## Step 2: Configure Your .env.local

### For Standard Gradium Keys (Recommended)

Copy this configuration to your `.env.local`:

```bash
# Gradium API Key (get from https://gradium.ai)
GRADIUM_API_KEY=gd_your_actual_key_here

# TTS WebSocket URL (choose based on your location)
# Use EU for Europe/Africa/Middle East:
GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts

# Or use US for Americas/Asia:
# GRADIUM_TTS_WS_URL=wss://us.api.gradium.ai/api/speech/tts

# TTS POST fallback (optional, matches region above)
GRADIUM_TTS_URL=https://eu.api.gradium.ai/api/post/speech/tts

# STT is WebSocket-only; leave empty to use browser fallback
GRADIUM_STT_URL=
```

### For Competition Keys (gsk_...)

If you have a competition key, you may need different endpoints:

```bash
GRADIUM_API_KEY=gsk_your_competition_key_here

# Check competition docs for correct endpoints!
# Competition endpoints might be different from standard ones
GRADIUM_TTS_WS_URL=wss://competition.api.gradium.ai/api/speech/tts  # EXAMPLE - verify with docs
GRADIUM_TTS_URL=https://competition.api.gradium.ai/api/post/speech/tts  # EXAMPLE - verify with docs
```

---

## Step 3: Restart Your Dev Server

After updating `.env.local`:

```bash
npm run dev
```

---

## Step 4: Test Your Setup

### Test 1: Check API Health

```bash
curl http://localhost:3000/api/health
```

Expected response should show:
- `gradiumConfigured: true`
- `gradiumTtsMethod: "websocket"` or `"post"`

### Test 2: Test TTS

```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, this is a test.","lang":"en","voiceStyle":"friendly"}' \
  --output test.wav
```

If successful, you'll have a `test.wav` file you can play.

### Test 3: Test in Browser

1. Go to http://localhost:3000
2. Create a new tour
3. Start the tour
4. Listen for the intro audio (should use Gradium TTS)

---

## Troubleshooting

### Issue 1: "GRADIUM_API_KEY is empty"

**Solution:** 
- Make sure your `.env.local` has `GRADIUM_API_KEY=...` (no spaces around `=`)
- Restart the dev server after adding the key
- Check the key doesn't have extra quotes or spaces

### Issue 2: WebSocket timeout or connection refused

**Possible Causes & Solutions:**

1. **Wrong endpoint URL**
   - Standard keys use: `wss://eu.api.gradium.ai/api/speech/tts` or `wss://us.api.gradium.ai/api/speech/tts`
   - Competition keys may use different URLs - check competition docs

2. **Network/Firewall issues**
   - Make sure your network allows WebSocket connections
   - Try switching between EU and US endpoints
   - Check if you're behind a corporate firewall

3. **Invalid API key**
   - Verify your key is active in the Gradium dashboard
   - Make sure you copied the entire key (they're long!)
   - Check for any spaces or newlines in the key

### Issue 3: "Policy violation" or 1008 error

**Solution:**
- Your API key doesn't have TTS permissions
- Log into https://gradium.ai and check your API key permissions
- You may need to upgrade your plan or request TTS access

### Issue 4: "voice_id" errors

**Solution:**
- The voice IDs in the code are for standard Gradium accounts
- Competition keys might have different voice IDs
- Check your competition documentation for available voices
- You can modify `/app/api/tts/route.ts` to use different voice IDs

### Issue 5: 404 Not Found errors

**Solution (for competition keys):**
- Your competition uses different endpoints
- Contact competition organizers or Gradium support
- Check competition Slack/Discord/email for API documentation
- Email support@gradium.ai with your key format (gsk_...) and ask for endpoints

---

## WebSocket vs POST Method

The app tries WebSocket first (faster, more efficient), then falls back to POST if WebSocket fails.

### WebSocket (Preferred)
- **Faster:** Streaming audio as it's generated
- **More efficient:** Single connection, lower latency
- **URL:** `wss://eu.api.gradium.ai/api/speech/tts`

### POST (Fallback)
- **Simpler:** Standard HTTP request
- **More compatible:** Works everywhere
- **URL:** `https://eu.api.gradium.ai/api/post/speech/tts`

Both methods are configured and ready to use!

---

## Competition-Specific Setup

If you're using this for a competition:

### 1. Find Competition Documentation
- Check competition website/portal
- Look for "API Integration" or "Gradium Setup" docs
- Search competition Slack/Discord for "Gradium" or "API"

### 2. Get Competition Endpoints
You need:
- TTS WebSocket URL (wss://...)
- TTS POST URL (https://...)
- List of available voice IDs

### 3. Contact Support if Needed

**Email Template for Gradium Support:**

```
Subject: Competition API Setup - Need Endpoint URLs

Hi Gradium Team,

I'm participating in [competition name] and have a competition API key 
(format: gsk_...) but I need the correct endpoints.

Could you please provide:
1. TTS WebSocket endpoint URL (wss://...)
2. TTS POST endpoint URL (https://...)
3. Available voice IDs for my key
4. Any special configuration required

My key starts with: gsk_[first 10 chars]

Thank you!
```

---

## Current Configuration Status

Your current `.env.local` has:
- ✅ API Key: `gsk_...` (competition key format)
- ✅ WebSocket URL: `wss://eu.api.gradium.ai/api/speech/tts`
- ✅ POST URL: `https://eu.api.gradium.ai/api/post/speech/tts`

**Note:** If you're getting 404 errors, you likely need competition-specific endpoints. Contact the competition organizers or Gradium support.

---

## Voice IDs Reference

The app includes these voice IDs for standard Gradium accounts:

| Language | Friendly | Historian | Funny |
|----------|----------|-----------|-------|
| English (en) | Emma | John | Kent |
| French (fr) | Elise | Leo | Leo |
| Spanish (es) | Valentina | Sergio | Valentina |
| German (de) | Mia | Maximilian | Mia |
| Portuguese (pt) | Alice | Davi | Alice |

These IDs are for **standard Gradium accounts**. Competition keys may have different voice IDs.

---

## Need Help?

1. **Standard Gradium:** https://gradium.ai/api_docs.html
2. **Support Email:** support@gradium.ai
3. **Competition Issues:** Contact competition organizers
4. **App Issues:** Check the console logs in your browser and terminal

---

## What's Been Fixed

The WebSocket implementation now includes:

✅ **Better error handling** - Clear error messages with hints
✅ **Improved connection logic** - Proper setup message format
✅ **Language support** - Correct language configuration
✅ **Speed control** - Audio plays at 0.95x speed (slightly slower, clearer)
✅ **Retry logic** - Falls back to POST if WebSocket fails
✅ **Detailed logging** - Easier to debug connection issues

Your app is ready to use Gradium TTS once you have the correct API key and endpoints configured!
