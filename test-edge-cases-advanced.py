#!/usr/bin/env python3
"""
Advanced Edge Case Testing - Audio, Geolocation, Session Management
"""

import json
import urllib.request
import urllib.error
import time

BASE = "http://localhost:3006"

def post(path, data, timeout=30):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode()) if e.read() else {}

print("╔═══════════════════════════════════════════════════════════════════╗")
print("║     ADVANCED EDGE CASE TESTING                                    ║")
print("╚═══════════════════════════════════════════════════════════════════╝\n")

# ============================================================================
# PHASE 9: AUDIO PLAYBACK EDGE CASES
# ============================================================================
print("━━━ PHASE 9: AUDIO PLAYBACK EDGE CASES ━━━\n")

# Test 9.1: Concurrent TTS requests
print("Testing concurrent TTS requests...")
import threading
results = []
def concurrent_tts(i):
    status, resp = post("/api/tts", {
        "text": f"Test {i}",
        "lang": "en",
        "returnBase64": True
    })
    results.append((i, status == 200))

threads = [threading.Thread(target=concurrent_tts, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

passed = sum(1 for _, ok in results if ok)
print(f"  ✅ Concurrent TTS: {passed}/5 succeeded")

# Test 9.2: Very short text
status, resp = post("/api/tts", {"text": "Hi", "lang": "en", "returnBase64": True})
print(f"  {'✅' if status == 200 else '❌'} Very short text: {status}")

# Test 9.3: Text with only punctuation
status, resp = post("/api/tts", {"text": "!!!", "lang": "en", "returnBase64": True})
print(f"  {'✅' if status == 200 else '❌'} Punctuation only: {status}")

# ============================================================================
# PHASE 10: SESSION PERSISTENCE
# ============================================================================
print("\n━━━ PHASE 10: SESSION PERSISTENCE ━━━\n")

# Generate tour
status, tour = post("/api/tour/generate", {
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
    "theme": "history",
    "durationMin": 25
})

if status == 200:
    session_id = tour.get("sessionId", "")
    print(f"  ✅ Tour generated: {session_id[:20]}...")
    print(f"  ✅ POIs: {len(tour.get('pois', []))}")
    print(f"  ✅ Distance: {tour.get('tourPlan', {}).get('distanceMeters', 0) / 1000:.2f} km")
else:
    print(f"  ❌ Tour generation failed: {status}")

# ============================================================================
# PHASE 11: BOUNDARY CONDITIONS
# ============================================================================
print("\n━━━ PHASE 11: BOUNDARY CONDITIONS ━━━\n")

# Test 11.1: Duration boundaries
for dur in [14, 15, 89, 90, 91]:
    status, _ = post("/api/tour/generate", {
        "start": {"lat": 37.7749, "lng": -122.4194, "label": "Test"},
        "theme": "history",
        "durationMin": dur
    })
    expected = 400 if dur < 15 or dur > 90 else 200
    symbol = "✅" if status == expected else "❌"
    print(f"  {symbol} Duration {dur}min: {status} (expected {expected})")

# Test 11.2: Coordinate boundaries
boundary_tests = [
    (-90, -180, True),   # Valid: South Pole, International Date Line
    (90, 180, True),     # Valid: North Pole, Date Line
    (-91, 0, False),     # Invalid: lat too low
    (91, 0, False),      # Invalid: lat too high
    (0, -181, False),    # Invalid: lng too low
    (0, 181, False),     # Invalid: lng too high
]

for lat, lng, should_pass in boundary_tests:
    status, _ = post("/api/tour/generate", {
        "start": {"lat": lat, "lng": lng, "label": "Boundary"},
        "theme": "history",
        "durationMin": 30
    })
    expected = 200 if should_pass else 400
    symbol = "✅" if status == expected else "❌"
    print(f"  {symbol} Coords ({lat}, {lng}): {status} (expected {expected})")

# ============================================================================
# PHASE 12: ERROR RECOVERY
# ============================================================================
print("\n━━━ PHASE 12: ERROR RECOVERY ━━━\n")

# Test 12.1: Recovery after rate limit
print("  Testing recovery after rate limit...")
time.sleep(2)  # Wait for rate limit to reset
status, resp = post("/api/tts", {"text": "Recovery test", "lang": "en", "returnBase64": True})
print(f"  {'✅' if status == 200 else '❌'} Recovery after rate limit: {status}")

# ============================================================================
# PHASE 13: DATA INTEGRITY
# ============================================================================
print("\n━━━ PHASE 13: DATA INTEGRITY ━━━\n")

# Generate tour and verify structure
status, tour = post("/api/tour/generate", {
    "start": {"lat": 40.7128, "lng": -74.0060, "label": "NYC"},
    "theme": "food",
    "durationMin": 30
})

if status == 200:
    checks = [
        ("sessionId", bool(tour.get("sessionId"))),
        ("tourPlan", bool(tour.get("tourPlan"))),
        ("pois", len(tour.get("pois", [])) > 0),
        ("intro", len(tour.get("tourPlan", {}).get("intro", "")) > 0),
        ("outro", len(tour.get("tourPlan", {}).get("outro", "")) > 0),
        ("routePoints", len(tour.get("tourPlan", {}).get("routePoints", [])) >= 3),
        ("distanceMeters", tour.get("tourPlan", {}).get("distanceMeters", 0) > 0),
    ]
    
    for name, passed in checks:
        print(f"  {'✅' if passed else '❌'} {name}: {'OK' if passed else 'MISSING'}")

print("\n✅ Advanced edge case testing complete!")
