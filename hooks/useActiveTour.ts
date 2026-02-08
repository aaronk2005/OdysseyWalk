"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import { GeoProvider } from "@/lib/geo/GeoProvider";
import { GeoSimProvider } from "@/lib/geo/GeoSimProvider";
import { createTriggerEngine } from "@/lib/geo/GeoTriggerEngine";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import type { SessionState, LatLng, POI } from "@/lib/types";
import { AudioState } from "@/lib/types";

const geoReal = new GeoProvider();
const geoSim = new GeoSimProvider();

/** setupComplete: for pre-planned tours, false until user completes language/voice setup; then we prewarm. For generated tours, pass true so we prewarm immediately. */
export function useActiveTour(setupComplete = true) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [audioState, setAudioState] = useState<AudioState>(AudioState.IDLE);
  const [introPlayed, setIntroPlayed] = useState(false);
  /** True once intro (and optionally first POI) prewarm has completed so "Start" tap is instant. */
  const [introAudioReady, setIntroAudioReady] = useState(false);
  const [askState, setAskState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [lastTriggeredPoi, setLastTriggeredPoi] = useState<POI | null>(null);
  const providerRef = useRef<typeof geoReal | typeof geoSim>(geoSim);
  const triggerCheckRef = useRef<ReturnType<typeof createTriggerEngine> | null>(null);

  // Load session, route, POIs, and (when ready) set voice options and prewarm audio
  useEffect(() => {
    const s = loadTour();
    if (!s) {
      router.replace("/create");
      return;
    }
    setSession(s);
    const points = s.tourPlan.routePoints ?? [];
    geoSim.setRoute(points);
    geoSim.setPoiPositions(s.pois.map((p) => ({ poiId: p.poiId, lat: p.lat, lng: p.lng })));
    if (points.length > 0) {
      setUserLocation({ lat: points[0].lat, lng: points[0].lng });
    }
    triggerCheckRef.current = createTriggerEngine(s.pois, s.visitedPoiIds);

    // Pre-planned: wait for setup (language/voice). Generated: prewarm immediately.
    const readyToPrewarm = s.isPreplanned ? setupComplete : true;
    if (!readyToPrewarm) {
      setIntroAudioReady(false);
      return;
    }
    // User has confirmed language/voice (or no setup step): apply tour settings and prewarm
    const tourLang = s.tourPlan.voiceLang ?? "en";
    const tourVoiceStyle = s.tourPlan.voiceStyle ?? "friendly";
    AudioSessionManager.setOptions({ lang: tourLang, voiceStyle: tourVoiceStyle });
    const firstScript = s.pois[0]
      ? (s.pois[0].script ?? s.pois[0].scripts?.friendly ?? s.pois[0].scripts?.historian ?? s.pois[0].scripts?.funny ?? "")
      : undefined;
    setIntroAudioReady(false);
    AudioSessionManager.prewarm(s.tourPlan.intro, firstScript)
      .then(() => setIntroAudioReady(true))
      .catch(() => setIntroAudioReady(true));
    const scriptsToPrewarm = s.pois.slice(1, 4).map(poi =>
      poi.script ?? poi.scripts?.friendly ?? poi.scripts?.historian ?? poi.scripts?.funny ?? ""
    ).filter(scr => scr.length > 0);
    if (scriptsToPrewarm.length > 0) {
      AudioSessionManager.prewarmPois(scriptsToPrewarm).catch(() => {});
    }
  }, [router, setupComplete]);

  useEffect(() => {
    if (!session) return;
    providerRef.current = session.mode === "demo" ? geoSim : geoReal;
    if (session.mode === "demo") {
      geoReal.stop();
      geoSim.start();
    } else {
      geoSim.stop();
      geoReal.start();
    }
  }, [session?.mode, session]);

  useEffect(() => {
    if (!session) return;
    triggerCheckRef.current = createTriggerEngine(session.pois, session.visitedPoiIds);
  }, [session?.pois, session?.visitedPoiIds]);

  useEffect(() => {
    const unsub = AudioSessionManager.subscribe(setAudioState);
    return () => unsub();
  }, []);

  const startWalk = useCallback(async () => {
    const s = loadTour();
    if (!s) return;
    // Stop any preview audio that might be playing
    AudioSessionManager.stop();
    updateSession({ startedAt: Date.now(), mode: s.mode });
    setSession(loadTour());
    // Switch to active walk view (stop 0) immediately so user sees map while intro plays
    setIntroPlayed(true);
    // Use tour plan's voice settings for consistency
    const tourLang = s.tourPlan.voiceLang ?? "en";
    const tourVoiceStyle = s.tourPlan.voiceStyle ?? "friendly";
    AudioSessionManager.setOptions({ lang: tourLang, voiceStyle: tourVoiceStyle });
    const introText =
      (typeof s.tourPlan?.intro === "string" && s.tourPlan.intro.trim()) || "Welcome. Let's begin.";
    try {
      await AudioSessionManager.playIntro(introText);
      // After intro, announce the first checkpoint destination
      if (s.pois.length > 0) {
        const firstPoi = s.pois[0];
        const firstCheckpointMsg = `Let's head to our first stop: ${firstPoi.name}. Follow the route on your map.`;
        await AudioSessionManager.playAnswer(firstCheckpointMsg);
      }
    } catch {
      // Continue anyway — browser TTS fallback or silent mode
    }
    updateSession({});
    setSession(loadTour());
  }, []);

  useEffect(() => {
    if (!session || !introPlayed) return;
    const unsub = providerRef.current.subscribe((update) => {
      setUserLocation({ lat: update.lat, lng: update.lng });
      const check = triggerCheckRef.current;
      if (!check) return;
      const ev = check(update);
      if (ev) {
        const s = loadTour();
        if (!s || s.visitedPoiIds.includes(ev.poiId)) return;
        const poi = s.pois.find((p) => p.poiId === ev.poiId);
        if (!poi) return;
        const nextVisited = [...s.visitedPoiIds, ev.poiId];
        updateSession({ visitedPoiIds: nextVisited, activePoiId: ev.poiId });
        setSession(loadTour());
        setLastTriggeredPoi(poi);
        const isLast = nextVisited.length >= s.pois.length;
        if (isLast) {
          updateSession({ endedAt: Date.now() });
          AudioSessionManager.playPoiScript(poi).then(async () => {
            if (s.tourPlan.voiceLang) AudioSessionManager.setOptions({ lang: s.tourPlan.voiceLang });
            if (s.tourPlan.voiceStyle) AudioSessionManager.setOptions({ voiceStyle: s.tourPlan.voiceStyle });
            await AudioSessionManager.prewarmOutro(s.tourPlan.outro ?? "");
            router.push("/tour/complete");
          });
        } else {
          AudioSessionManager.playPoiScript(poi);
          // Prewarm next 2-3 POIs immediately for reduced "Next stop" latency
          const upcomingPois = s.pois.filter(p => !nextVisited.includes(p.poiId)).slice(0, 3);
          const upcomingScripts = upcomingPois.map(p =>
            p.script ?? p.scripts?.friendly ?? p.scripts?.historian ?? p.scripts?.funny ?? ""
          ).filter(scr => scr.length > 0);
          if (upcomingScripts.length > 0) {
            AudioSessionManager.prewarmPois(upcomingScripts).catch(() => {});
          }
        }
      }
    });
    return () => unsub();
  }, [session, introPlayed, router]);

  const playPoi = useCallback((poi: POI) => {
    const s = loadTour();
    if (!s) return;
    if (!s.visitedPoiIds.includes(poi.poiId)) {
      updateSession({
        visitedPoiIds: [...s.visitedPoiIds, poi.poiId],
        activePoiId: poi.poiId,
      });
      setSession(loadTour());
    }
    const nextVisited = [...s.visitedPoiIds, poi.poiId];
    const isLast = nextVisited.length >= s.pois.length;
    if (isLast) {
      updateSession({ endedAt: Date.now() });
      AudioSessionManager.playPoiScript(poi).then(async () => {
        if (s.tourPlan.voiceLang) AudioSessionManager.setOptions({ lang: s.tourPlan.voiceLang });
        if (s.tourPlan.voiceStyle) AudioSessionManager.setOptions({ voiceStyle: s.tourPlan.voiceStyle });
        await AudioSessionManager.prewarmOutro(s.tourPlan.outro ?? "");
        router.push("/tour/complete");
      });
    } else {
      AudioSessionManager.playPoiScript(poi);
    }
  }, [router]);

  const jumpNext = useCallback(() => {
    const s = loadTour();
    if (!s) return;
    const next = s.pois.find((p) => !s.visitedPoiIds.includes(p.poiId));
    if (next) {
      geoSim.jumpToPoi(next.poiId);
      const pos = { lat: next.lat, lng: next.lng };
      setUserLocation(pos);
      playPoi(next);
    }
  }, [playPoi]);

  const pause = useCallback(() => AudioSessionManager.pause(), []);
  const resume = useCallback(() => AudioSessionManager.resume(), []);
  const replay = useCallback(() => {
    const s = loadTour();
    if (!s?.activePoiId) return;
    const poi = s.pois.find((p) => p.poiId === s.activePoiId);
    if (poi) AudioSessionManager.playPoiScript(poi);
  }, []);
  const endTour = useCallback(async () => {
    const s = loadTour();
    if (!s) return;
    AudioSessionManager.stop();
    updateSession({ endedAt: Date.now() });
    if (s.tourPlan.voiceLang) AudioSessionManager.setOptions({ lang: s.tourPlan.voiceLang });
    if (s.tourPlan.voiceStyle) AudioSessionManager.setOptions({ voiceStyle: s.tourPlan.voiceStyle });
    await AudioSessionManager.prewarmOutro(s.tourPlan.outro ?? "");
    router.push("/tour/complete");
  }, [router]);
  const clearAudioCache = useCallback(() => AudioSessionManager.clearCache(), []);
  const refreshSession = useCallback(() => {
    const s = loadTour();
    if (s) setSession(s);
  }, []);

  useEffect(() => {
    if (!session || session.mode !== "real") return;
    geoReal.setPermissionCallback((denied) => {
      if (denied) {
        updateSession({ mode: "demo" });
        setSession(loadTour());
        geoReal.stop();
        geoSim.start();
      }
    });
    return () => geoReal.setPermissionCallback(null);
  }, [session?.sessionId, session?.mode]);

  const currentPoi = session?.activePoiId
    ? session.pois.find((p) => p.poiId === session.activePoiId) ?? null
    : null;
  const nextPoi = session?.pois.find((p) => !session.visitedPoiIds.includes(p.poiId)) ?? null;

  const clearLastTriggeredPoi = useCallback(() => setLastTriggeredPoi(null), []);

  return {
    session,
    userLocation,
    audioState,
    askState,
    setAskState,
    introPlayed,
    introAudioReady,
    startWalk,
    playPoi,
    jumpNext,
    pause,
    resume,
    replay,
    endTour,
    clearAudioCache,
    refreshSession,
    currentPoi,
    nextPoi,
    lastTriggeredPoi,
    clearLastTriggeredPoi,
  };
}
