"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/deepguard-api";

interface ModelInfo {
  key: string;
  name: string;
  score: number;
  verified: boolean;
  note: string;
}

interface VerdictData {
  label: string;
  confidence: number;
  agreement: string;
  models: ModelInfo[];
}

interface EvidenceFrame {
  timestamp: string;
  time_sec: number;
  face_detected: boolean;
  face_confidence: number | null;
  original_frame_url: string | null;
  heatmap_url: string | null;
}

interface EvidenceData {
  original_video_url: string;
  frames: EvidenceFrame[];
}

interface SignalsData {
  models: Array<{ name: string; score: number }>;
  agreement: string;
  agreement_spread: number;
}

interface TimelinePoint {
  time_sec: number;
  timestamp: string;
  xception: number;
  spsl: number;
  ucf: number;
}

interface TimelineData {
  duration_sec: number;
  points: TimelinePoint[];
}

interface AppState {
  videoId: string | null;
  uploadStatus: "idle" | "queued" | "processing" | "done" | "error";
  progress: string | null;
  error: string | null;
  verdict: VerdictData | null;
  evidence: EvidenceData | null;
  signals: SignalsData | null;
  timeline: TimelineData | null;
}

interface DeepGuardContextType extends AppState {
  uploadFile: (file: File) => Promise<void>;
  reset: () => void;
}

const DeepGuardContext = createContext<DeepGuardContextType | null>(null);

export function DeepGuardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    videoId: null,
    uploadStatus: "idle",
    progress: null,
    error: null,
    verdict: null,
    evidence: null,
    signals: null,
    timeline: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchResults = useCallback(async (videoId: string) => {
    try {
      const [verdict, evidence, signals, timeline] = await Promise.all([
        api.getVerdict(videoId),
        api.getEvidence(videoId),
        api.getSignals(videoId),
        api.getTimeline(videoId),
      ]);
      setState((prev) => ({ ...prev, verdict, evidence, signals, timeline }));
    } catch (e: any) {
       setState((prev) => ({ ...prev, error: e.message || "Failed to fetch results" }));
    }
  }, []);

  const startPolling = useCallback((videoId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getStatus(videoId);
        setState((prev) => ({
          ...prev,
          uploadStatus: status.status === "done" ? "done" : status.status === "error" ? "error" : "processing",
          progress: status.progress,
          error: status.error ?? null,
        }));
        if (status.status === "done") {
          stopPolling();
          fetchResults(videoId);
        } else if (status.status === "error") {
            stopPolling();
        }
      } catch {
        setState((prev) => ({ ...prev, uploadStatus: "error", error: "Failed to poll status" }));
        stopPolling();
      }
    }, 2500);
  }, [stopPolling, fetchResults]);


  const uploadFile = useCallback(async (file: File) => {
    stopPolling();
    setState({
      videoId: null,
      uploadStatus: "queued",
      progress: null,
      error: null,
      verdict: null,
      evidence: null,
      signals: null,
      timeline: null,
    });

    try {
      const { video_id } = await api.uploadVideo(file);
      setState((prev) => ({ ...prev, videoId: video_id, uploadStatus: "queued" }));
      startPolling(video_id);
    } catch (err: any) {
      setState((prev) => ({ ...prev, uploadStatus: "error", error: err.message || "Upload failed" }));
    }
  }, [stopPolling, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      videoId: null,
      uploadStatus: "idle",
      progress: null,
      error: null,
      verdict: null,
      evidence: null,
      signals: null,
      timeline: null,
    });
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <DeepGuardContext.Provider
      value={{ ...state, uploadFile, reset }}
    >
      {children}
    </DeepGuardContext.Provider>
  );
}

export function useDeepGuard() {
  const ctx = useContext(DeepGuardContext);
  if (!ctx) throw new Error("useDeepGuard must be used within DeepGuardProvider");
  return ctx;
}

export type { VerdictData, EvidenceData, EvidenceFrame, SignalsData, TimelineData, TimelinePoint, ModelInfo, AppState };