"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { MapView } from "@/components/MapView";
import { BottomSheetPlayer } from "@/components/BottomSheetPlayer";
import { AskTextModal } from "@/components/AskTextModal";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { MapsKeyBanner } from "@/components/MapsKeyBanner";
import { DebugPanel, type ApiStatus } from "@/components/DebugPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useToast } from "@/components/ToastProvider";
import { useActiveTour } from "@/hooks/useActiveTour";
import { getClientConfig } from "@/lib/config";
import { startRecording, stopRecording, runVoiceQaLoop } from "@/lib/voice/VoiceController";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import { AudioState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export default function TourActivePage() {
  const clientConfig = getClientConfig();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const toast = useToast();

  const {
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
  } = useActiveTour();

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApiStatus({ mapsKeyPresent: d.mapsKeyPresent, openRouterConfigured: d.openRouterConfigured, gradiumConfigured: d.gradiumConfigured }))
      .catch(() => setApiStatus(null));
  }, []);

  const handleAskStart = useCallback(() => {
    setLastError(null);
    setAskState("listening");
    startRecording({
      onListeningEnd: () => setAskState("idle"),
      onThinking: () => setAskState("thinking"),
      onAnswerStart: () => setAskState("speaking"),
      onAnswerEnd: () => setAskState("idle"),
      onTypedQuestionFallback: () => setShowAskModal(true),
      onError: (err) => {
        setLastError(err);
        toast.showToast(err, "error");
      },
    });
  }, [setAskState, toast]);

  const handleAskStop = useCallback(() => {
    stopRecording();
  }, []);

  const handleTypedQuestion = useCallback(
    async (question: string) => {
      setShowAskModal(false);
      setLastError(null);
      setAskState("thinking");
      const s = loadTour();
      try {
        await runVoiceQaLoop(s, () => Promise.resolve(question), {
          onAnswerStart: () => setAskState("speaking"),
          onAnswerEnd: () => setAskState("idle"),
          onError: (err) => {
            setLastError(err);
            toast.showToast(err, "error");
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Q&A failed";
        setLastError(msg);
        toast.showToast(msg, "error");
      }
    },
    [setAskState, toast]
  );

  const handleDemoModeChange = useCallback((demo: boolean) => {
    updateSession({ mode: demo ? "demo" : "real" });
    refreshSession();
  }, [refreshSession]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="w-10 h-10 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  const center = userLocation ?? (session.pois[0] ? { lat: session.pois[0].lat, lng: session.pois[0].lng } : { lat: 37.78, lng: -122.41 });
  const isPlaying = audioState === AudioState.NARRATING || audioState === AudioState.PLAYING_INTRO || audioState === AudioState.PLAYING_OUTRO || audioState === AudioState.ANSWERING;
  const isPaused = audioState === AudioState.PAUSED;

  return (
    <div className="fixed inset-0 flex flex-col bg-navy-950">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-navy-950/90 backdrop-blur z-20">
        <Link href="/create" className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-white truncate flex-1 text-center mx-2">
          {session.tourPlan.theme} Walk
        </h1>
        <button type="button" onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {!clientConfig.mapsKeyPresent && <div className="px-4 pt-2 z-20"><MapsKeyBanner /></div>}
      {session.mode === "demo" && (
        <div className="px-4 pt-2 z-20">
          <DemoModeBanner onJumpNext={jumpNext} onRunScriptedDemo={() => {}} />
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
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
            followUser={session.mode === "demo"}
            className="absolute inset-0 rounded-none"
          />
        ) : (
          <div className="absolute inset-0 overflow-auto p-4">
            <p className="text-white/60 text-sm mb-4">Map unavailable. Use the player and list below.</p>
            <div className="space-y-2">
              {session.pois.map((poi) => (
                <button
                  key={poi.poiId}
                  type="button"
                  onClick={() => playPoi(poi)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-colors",
                    session.visitedPoiIds.includes(poi.poiId)
                      ? "border-white/10 bg-white/5 text-white/80"
                      : "border-accent-blue/30 bg-accent-blue/10 text-white"
                  )}
                >
                  <span className="font-medium">{poi.name}</span>
                  {session.visitedPoiIds.includes(poi.poiId) && (
                    <span className="ml-2 text-xs text-emerald-400">Visited</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!introPlayed ? (
        <div className="border-t border-white/10 bg-navy-900/95 backdrop-blur p-6 safe-bottom">
          <p className="text-white/80 mb-4">Your tour is ready. Start to hear the intro and begin navigation.</p>
          <button
            type="button"
            onClick={startWalk}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold"
          >
            Start Walk
          </button>
        </div>
      ) : (
        <BottomSheetPlayer
          tourName={`${session.tourPlan.theme} Walk`}
          currentPoi={currentPoi}
          nextPoiName={nextPoi?.name ?? null}
          visitedCount={session.visitedPoiIds.length}
          totalCount={session.pois.length}
          audioState={audioState}
          isDemoMode={session.mode === "demo"}
          onPlay={resume}
          onPause={pause}
          onResume={resume}
          onSkipNext={jumpNext}
          onReplay={replay}
          onAskStart={handleAskStart}
          onAskStop={handleAskStop}
          isAsking={askState !== "idle"}
          askState={askState}
        />
      )}

      <AskTextModal
        open={showAskModal}
        onClose={() => setShowAskModal(false)}
        onSubmit={handleTypedQuestion}
      />

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

      {introPlayed && (
        <DebugPanel
          pois={session.pois}
          visitedPoiIds={session.visitedPoiIds}
          onJumpToPoi={(poiId) => {
            const p = session.pois.find((x) => x.poiId === poiId);
            if (p) playPoi(p);
          }}
          onForceTriggerNext={jumpNext}
          onClearAudioCache={clearAudioCache}
          userLat={userLocation?.lat}
          userLng={userLocation?.lng}
          audioState={audioState}
          apiStatus={apiStatus}
          lastError={lastError}
        />
      )}
    </div>
  );
}
