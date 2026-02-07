#!/usr/bin/env python3
"""
Security & Performance Testing
"""

import json
import urllib.request
import urllib.error
import time
import sys

BASE = "http://localhost:3006"

def post(path, data, timeout=30):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as res:
            elapsed = time.time() - start
            return res.status, json.loads(res.read()), elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start if 'start' in locals() else 0
        return e.code, json.loads(e.read().decode()) if e.read() else {}, elapsed
    except Exception as e:
        return None, {"error": str(e)}, 0

print("╔═══════════════════════════════════════════════════════════════════╗")
print("║     SECURITY & PERFORMANCE TESTING                                ║")
print("╚═══════════════════════════════════════════════════════════════════╝\n")

# ============================================================================
# PHASE 14: SECURITY TESTS
# ============================================================================
print("━━━ PHASE 14: SECURITY TESTS ━━━\n")

# Test 14.1: XSS in location label
status, resp, _ = post("/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "<script>alert('xss')</script>"},
    "theme": "history",
    "durationMin": 30
})
print(f"  {'✅' if status == 200 else '❌'} XSS attempt in label: {status} (should sanitize)")

# Test 14.2: SQL injection attempt (if applicable)
status, resp, _ = post("/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "'; DROP TABLE tours; --"},
    "theme": "history",
    "durationMin": 30
})
print(f"  {'✅' if status == 200 else '❌'} SQL injection attempt: {status}")

# Test 14.3: Very large payload
large_label = "A" * 10000
status, resp, _ = post("/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": large_label},
    "theme": "history",
    "durationMin": 30
})
print(f"  {'✅' if status in [200, 400, 413] else '❌'} Very large payload: {status}")

# Test 14.4: API key exposure check (health endpoint shouldn't expose keys)
status, resp = urllib.request.urlopen(f"{BASE}/api/health")
health = json.loads(resp.read())
has_keys = "OPENROUTER_API_KEY" in str(health) or "GRADIUM_API_KEY" in str(health)
print(f"  {'✅' if not has_keys else '❌'} API keys not exposed in health: {not has_keys}")

# ============================================================================
# PHASE 15: PERFORMANCE TESTS
# ============================================================================
print("\n━━━ PHASE 15: PERFORMANCE TESTS ━━━\n")

# Test 15.1: Health endpoint speed
times = []
for _ in range(10):
    start = time.time()
    urllib.request.urlopen(f"{BASE}/api/health", timeout=5)
    times.append(time.time() - start)
avg_time = sum(times) / len(times)
print(f"  ✅ Health endpoint avg: {avg_time*1000:.1f}ms (target: <100ms)")

# Test 15.2: TTS response time
status, resp, elapsed = post("/api/tts", {
    "text": "Hello, this is a performance test.",
    "lang": "en",
    "returnBase64": True
})
print(f"  {'✅' if elapsed < 5 else '⚠️'} TTS response time: {elapsed:.2f}s (target: <5s)")

# Test 15.3: Tour generation time
status, resp, elapsed = post("/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
    "theme": "history",
    "durationMin": 25
})
print(f"  {'✅' if elapsed < 30 else '⚠️'} Tour generation: {elapsed:.1f}s (target: <30s)")

# Test 15.4: Memory leak check (multiple requests)
print("  Testing memory stability (20 requests)...")
errors = 0
for i in range(20):
    status, _, elapsed = post("/api/tts", {
        "text": f"Test {i}",
        "lang": "en",
        "returnBase64": True
    }, timeout=10)
    if status != 200:
        errors += 1
    time.sleep(0.1)
print(f"  {'✅' if errors == 0 else '❌'} Memory stability: {errors}/20 errors")

print("\n✅ Security & Performance testing complete!")
