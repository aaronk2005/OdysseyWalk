"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Settings, Map as MapIcon, ListOrdered } from "lucide-react";
import { MapView } from "@/components/MapView";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { PreWalkBriefingSheet } from "@/components/PreWalkBriefingSheet";
import { ActiveWalkAudioPanel } from "@/components/ActiveWalkAudioPanel";
import { FirstTimeHint } from "@/components/FirstTimeHint";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MapsKeyBanner } from "@/components/MapsKeyBanner";
import { VoiceFallbackBanner } from "@/components/VoiceFallbackBanner";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useToast } from "@/components/ToastProvider";
import { useActiveTour } from "@/hooks/useActiveTour";
import { useVoiceNext } from "@/hooks/useVoiceNext";
import { getClientConfig } from "@/lib/config";
import { startRecording, stopRecording } from "@/lib/voice/VoiceController";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import { AudioState } from "@/lib/types";
import type { Lang, VoiceStyle } from "@/lib/types";
import { distanceMeters } from "@/lib/maps/haversine";
import { cn } from "@/lib/utils/cn";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const VOICE_OPTIONS: { value: VoiceStyle; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "historian", label: "Historian" },
  { value: "funny", label: "Funny" },
];

export default function TourActivePage() {
  const clientConfig = getClientConfig();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [setupComplete, setSetupComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [prevAudioState, setPrevAudioState] = useState<AudioState>(AudioState.IDLE);
  const [ending, setEnding] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<"map" | "directions">("map");
  const toast = useToast();

  const {
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
  } = useActiveTour(setupComplete);

  // Voice next feature for hands-free navigation
  const {
    startVoiceNext,
    stopVoiceNext,
    isVoiceNextRecording,
    voiceNextError,
  } = useVoiceNext(jumpNext);

  // Trigger map fit to route when pre-walk screen is shown (map zooms to route)
  useEffect(() => {
    if (session && !introPlayed && session.tourPlan.routePoints?.length) {
      setFitBoundsTrigger((k) => k + 1);
    }
  }, [session?.sessionId, introPlayed]);

  // Track previous audio state to show "Resume" hint after answer
  useEffect(() => {
    setPrevAudioState(audioState);
  }, [audioState]);

  useEffect(() => {
    return () => {
      AudioSessionManager.stop();
    };
  }, []);

  // Entering-stop feedback: brief toast when geo triggers a new stop
  useEffect(() => {
    if (lastTriggeredPoi) {
      toast.showToast(`Now at ${lastTriggeredPoi.name}`, "success");
      clearLastTriggeredPoi();
    }
  }, [lastTriggeredPoi, clearLastTriggeredPoi, toast]);

  const handleAskStart = useCallback(() => {
    setLastError(null);
    setAskState("listening");
    startRecording({
      onListeningEnd: () => setAskState("idle"),
      onThinking: () => setAskState("thinking"),
      onAnswerStart: () => setAskState("speaking"),
      onAnswerEnd: () => setAskState("idle"),
      onTypedQuestionFallback: () => toast.showToast("Voice input unavailable", "info"),
      onError: (err) => {
        setLastError(err);
        toast.showToast(err, "error");
      },
    });
  }, [setAskState, toast]);

  const handleAskStop = useCallback(() => {
    stopRecording();
  }, []);

  const handleDemoModeChange = useCallback((demo: boolean) => {
    updateSession({ mode: demo ? "demo" : "real" });
    refreshSession();
  }, [refreshSession]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentVoice = session.tourPlan.voiceStyle ?? "friendly";
  const currentLang = session.tourPlan.voiceLang === "fr" ? "fr" : "en";

  // Language & voice setup step only for pre-planned tours (before briefing and audio prewarm)
  if (session.isPreplanned && !setupComplete) {
    return (
      <div className="fixed inset-0 flex flex-col bg-app-bg">
        <header className="flex items-center justify-between px-4 py-3 border-b border-app-border bg-surface/95 z-20 safe-top">
          <Link
            href="/"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[40px] flex items-center justify-center" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <div className="w-10" />
        </header>
        <main className="flex-1 overflow-auto px-4 py-8 max-w-lg mx-auto w-full">
          <h1 className="text-xl font-semibold text-ink-primary mb-1">Language & voice</h1>
          <p className="text-body text-ink-secondary mb-6">
            Choose how you&apos;ll hear this tour. Narration will load after you continue.
          </p>
          <div className="space-y-6">
            <div>
              <p className="text-caption font-medium text-ink-secondary mb-2">Language</p>
              <div className="flex flex-wrap gap-2">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      updateSession({ tourPlan: { ...session.tourPlan, voiceLang: opt.value } });
                      refreshSession();
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-button text-sm font-medium transition-colors min-h-[44px]",
                      currentLang === opt.value
                        ? "bg-brand-primary text-white border border-brand-primary"
                        : "bg-surface border border-app-border text-ink-primary hover:bg-surface-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-caption font-medium text-ink-secondary mb-2">Voice style</p>
              <div className="flex flex-wrap gap-2">
                {VOICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      updateSession({ tourPlan: { ...session.tourPlan, voiceStyle: opt.value } });
                      refreshSession();
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-button text-sm font-medium transition-colors min-h-[44px]",
                      currentVoice === opt.value
                        ? "bg-brand-primary text-white border border-brand-primary"
                        : "bg-surface border border-app-border text-ink-primary hover:bg-surface-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              updateSession({ tourPlan: { ...session.tourPlan, voiceLang: currentLang, voiceStyle: currentVoice } });
              refreshSession();
              setSetupComplete(true);
            }}
            className="mt-8 w-full py-3.5 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primaryHover transition-colors min-h-[48px]"
          >
            Continue
          </button>
        </main>
      </div>
    );
  }

  const center = userLocation ?? (session.pois[0] ? { lat: session.pois[0].lat, lng: session.pois[0].lng } : { lat: 37.78, lng: -122.41 });
  const themeName = session.tourPlan?.theme ?? "Tour";
  const tourLabel = themeName.charAt(0).toUpperCase() + themeName.slice(1) + " Walk";
  const distanceKm = session.tourPlan.distanceMeters != null ? session.tourPlan.distanceMeters / 1000 : undefined;
  const durationMin = session.tourPlan.estimatedMinutes ?? 0;

  // Next stop badge: distance from user to next POI
  const nextStopDistanceM =
    userLocation && nextPoi ? Math.round(distanceMeters(userLocation, { lat: nextPoi.lat, lng: nextPoi.lng })) : null;
  const nextStopBadgeText =
    nextPoi && nextStopDistanceM != null
      ? `${nextPoi.name} · ${nextStopDistanceM < 1000 ? `${nextStopDistanceM}m` : `${(nextStopDistanceM / 1000).toFixed(1)} km`}`
      : nextPoi
        ? `Next: ${nextPoi.name}`
        : null;

  // State-based overlay: dim map when narration/answer/listening so audio is the focus
  const isNarrating =
    audioState === AudioState.NARRATING ||
    audioState === AudioState.PLAYING_INTRO ||
    audioState === AudioState.PLAYING_OUTRO;
  const isAnswering = audioState === AudioState.ANSWERING;
  const isAsking = askState !== "idle";
  const showDimOverlay = isAsking || isAnswering;
  const showSoftDim = isNarrating && !showDimOverlay;
  
  // Show "Resume" hint if previous state was ANSWERING and now we're IDLE/NAVIGATING
  const showResumeHint = prevAudioState === AudioState.ANSWERING && !isAnswering && !isNarrating;

  return (
    <div className="fixed inset-0 flex flex-col bg-app-bg">
      {/* Minimal header: only show when walking (after intro) so pre-walk is immersive */}
      <header
        className={
          introPlayed
            ? "flex items-center justify-between px-4 py-3 border-b border-app-border bg-surface/95 backdrop-blur-sm z-20 safe-top shrink-0"
            : "absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20 safe-top"
        }
      >
        <Link
          href="/create"
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors"
          aria-label="Back to create"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href="/" className="min-h-[40px] flex items-center justify-center" aria-label="Odyssey Walk home">
          <OdysseyLogo size="sm" />
        </Link>
        {introPlayed ? (
          <button
            type="button"
            disabled={ending}
            onClick={async () => {
              if (!confirm("End this tour? You'll see your summary and can start a new walk.")) return;
              setEnding(true);
              try {
                await endTour();
              } finally {
                setEnding(false);
              }
            }}
            className="px-3 py-1.5 mt-2 min-h-[40px] flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors font-medium text-sm disabled:opacity-70 disabled:cursor-wait"
            aria-label={ending ? "Preparing" : "End tour"}
          >
            {ending ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                <span>Preparing…</span>
              </>
            ) : (
              <span>End Tour</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </header>

      {!clientConfig.mapsKeyPresent && (
        <div className="px-4 pt-2 z-20">
          <MapsKeyBanner />
        </div>
      )}
      {!introPlayed && (
        <div className="px-4 pt-2 z-20">
          <VoiceFallbackBanner />
        </div>
      )}
      {introPlayed && session.mode === "demo" && (
        <div className="px-4 pt-2 z-20 shrink-0">
          <DemoModeBanner onJumpNext={jumpNext} onRunScriptedDemo={() => {}} />
        </div>
      )}

      {/* ─── PRE-WALK BRIEFING: Top 60% map, bottom 40% anchored sheet ─── */}
      {!introPlayed && (
        <>
          <div className="absolute inset-0 flex flex-col" style={{ paddingTop: "max(env(safe-area-inset-top), 56px)" }}>
            <div className="h-[60vh] min-h-[240px] relative overflow-hidden shrink-0">
              {mapKey ? (
                <MapView
                  mapApiKey={mapKey}
                  center={center}
                  routePoints={session.tourPlan.routePoints}
                  pois={session.pois}
                  userLocation={null}
                  visitedPoiIds={[]}
                  activePoiId={session.pois[0]?.poiId ?? null}
                  onPoiClick={(id) => {
                    const poi = session.pois.find((p) => p.poiId === id);
                    if (poi) playPoi(poi);
                  }}
                  followUser={false}
                  fitBoundsTrigger={fitBoundsTrigger}
                  className="absolute inset-0 rounded-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-surface-muted">
                  <p className="text-caption text-ink-secondary text-center">Map unavailable</p>
                </div>
              )}
            </div>
          </div>

          <PreWalkBriefingSheet
            tourTitle={tourLabel}
            durationMin={durationMin}
            stopCount={session.pois.length}
            distanceKm={distanceKm}
            firstStopName={session.pois[0]?.name ?? null}
            introLine="You're about to start an audio-guided walk. Tap Start to hear the intro and begin."
            onStartWalk={startWalk}
            startReady={introAudioReady}
          />
        </>
      )}

      {/* ─── ACTIVE WALK: Full-height map + overlay control block at bottom ─── */}
      {introPlayed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Map fills space (flex-1); control block overlays at bottom */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {mapKey ? (
              <MapView
                mapApiKey={mapKey}
                center={center}
                routePoints={session.tourPlan.routePoints}
                pois={session.pois}
                userLocation={userLocation}
                visitedPoiIds={session.visitedPoiIds}
                activePoiId={session.activePoiId}
                onPoiClick={(id) => {
                  const poi = session.pois.find((p) => p.poiId === id);
                  if (poi) playPoi(poi);
                }}
                followUser={session.mode === "demo" || Boolean(userLocation)}
                navigationMode
                className="absolute inset-0 rounded-none"
                directionsOrigin={mapViewMode === "directions" ? userLocation : null}
                directionsDestination={
                  mapViewMode === "directions" && nextPoi
                    ? { lat: nextPoi.lat, lng: nextPoi.lng }
                    : null
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-surface-muted">
                <p className="text-caption text-ink-secondary text-center">Map unavailable</p>
              </div>
            )}

            {/* Map / Directions view toggle */}
            <div className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden border border-app-border/80 bg-surface/95 backdrop-blur-sm shadow">
              <button
                type="button"
                onClick={() => setMapViewMode("map")}
                className={cn(
                  "px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors",
                  mapViewMode === "map"
                    ? "bg-brand-primary text-white"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-app-bg"
                )}
                aria-pressed={mapViewMode === "map"}
                aria-label="Map view"
              >
                <MapIcon className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode("directions")}
                className={cn(
                  "px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors",
                  mapViewMode === "directions"
                    ? "bg-brand-primary text-white"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-app-bg"
                )}
                aria-pressed={mapViewMode === "directions"}
                aria-label="Directions view"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Directions
              </button>
            </div>

            {/* State overlay: dim when asking or answer playing */}
            <AnimatePresence>
              {showDimOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 pointer-events-none z-10"
                  aria-hidden
                />
              )}
              {showSoftDim && !showDimOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/15 pointer-events-none z-10"
                  aria-hidden
                />
              )}
            </AnimatePresence>

            {/* Next stop badge (map view only) */}
            {mapViewMode === "map" && nextStopBadgeText && (
              <div className="absolute bottom-[180px] left-4 right-4 z-10">
                <div className="inline-flex px-3 py-2 rounded-xl bg-surface/95 shadow-lg border border-app-border/60 backdrop-blur-md">
                  <span className="text-xs font-semibold text-ink-primary truncate">Next: {nextStopBadgeText}</span>
                </div>
              </div>
            )}

            {/* Control block: overlay at bottom of map (big card) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-4 safe-bottom">
              <ActiveWalkAudioPanel
                currentStopName={currentPoi?.name ?? "Intro"}
                stopIndex={session.visitedPoiIds.length}
                totalStops={session.pois.length}
                audioState={audioState}
                isAnswerPlaying={isAnswering}
                onPlayPause={() => {
                  const playing = audioState === AudioState.NARRATING || audioState === AudioState.PLAYING_INTRO || audioState === AudioState.PLAYING_OUTRO || audioState === AudioState.ANSWERING;
                  if (playing) pause();
                  else if (audioState === AudioState.PAUSED) resume();
                  else replay();
                }}
                onSkip={jumpNext}
                onReplay={replay}
                isDemoMode={session.mode === "demo"}
                showResumeHint={showResumeHint}
                currentStopWebsite={currentPoi?.website ?? null}
                askState={askState}
                onAskStart={handleAskStart}
                onAskStop={handleAskStop}
                onVoiceNextStart={startVoiceNext}
                onVoiceNextStop={stopVoiceNext}
                isVoiceNextRecording={isVoiceNextRecording}
                voiceNextError={voiceNextError}
              />
            </div>
          </div>

          <div className="shrink-0 relative">
            <FirstTimeHint
              storageKey="odyssey-hint-mic"
              message="Hold the mic to ask questions about this place"
              position="bottom"
            />
          </div>
        </motion.div>
      )}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        demoMode={session.mode === "demo"}
        onDemoModeChange={handleDemoModeChange}
        voiceStyle="friendly"
        onVoiceStyleChange={(v) => AudioSessionManager.setOptions({ voiceStyle: v })}
        lang="en"
        onLangChange={(l) => AudioSessionManager.setOptions({ lang: l })}
      />

    </div>
  );
}
