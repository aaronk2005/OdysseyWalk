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

export function useActiveTour() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [audioState, setAudioState] = useState<AudioState>(AudioState.IDLE);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [askState, setAskState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [lastTriggeredPoi, setLastTriggeredPoi] = useState<POI | null>(null);
  const providerRef = useRef<typeof geoReal | typeof geoSim>(geoSim);
  const triggerCheckRef = useRef<ReturnType<typeof createTriggerEngine> | null>(null);

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
    // Use tour plan's voice settings for consistency throughout the tour
    const tourLang = s.tourPlan.voiceLang ?? "en";
    const tourVoiceStyle = s.tourPlan.voiceStyle ?? "friendly";
    AudioSessionManager.setOptions({ lang: tourLang, voiceStyle: tourVoiceStyle });
    const firstScript = s.pois[0]
      ? (s.pois[0].script ?? s.pois[0].scripts?.friendly ?? s.pois[0].scripts?.historian ?? s.pois[0].scripts?.funny ?? "")
      : undefined;
    AudioSessionManager.prewarm(s.tourPlan.intro, firstScript).catch(() => {});
  }, [router]);

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
    updateSession({ startedAt: Date.now(), mode: s.mode });
    setSession(loadTour());
    // Use tour plan's voice settings for consistency
    const tourLang = s.tourPlan.voiceLang ?? "en";
    const tourVoiceStyle = s.tourPlan.voiceStyle ?? "friendly";
    AudioSessionManager.setOptions({ lang: tourLang, voiceStyle: tourVoiceStyle });
    try {
      await AudioSessionManager.playIntro(s.tourPlan.intro);
    } catch (e) {
      console.warn("[useActiveTour] Intro playback issue:", e);
      // Continue anyway — browser TTS fallback or silent mode
    }
    setIntroPlayed(true);
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
        AudioSessionManager.playPoiScript(poi);
        const isLast = nextVisited.length >= s.pois.length;
        if (isLast) {
          updateSession({ endedAt: Date.now() });
          AudioSessionManager.playOutro(s.tourPlan.outro).then(() => {
            router.push("/tour/complete");
          });
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
    AudioSessionManager.playPoiScript(poi);
    const nextVisited = [...s.visitedPoiIds, poi.poiId];
    if (nextVisited.length >= s.pois.length) {
      updateSession({ endedAt: Date.now() });
      AudioSessionManager.playOutro(s.tourPlan.outro).then(() => router.push("/tour/complete"));
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
    startWalk,
    playPoi,
    jumpNext,
    pause,
    resume,
    replay,
    clearAudioCache,
    refreshSession,
    currentPoi,
    nextPoi,
    lastTriggeredPoi,
    clearLastTriggeredPoi,
  };
}
