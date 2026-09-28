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

interface ExplanationModel {
  key: string;
  score: number;
  std: number;
  faithfulness_drop: number | null;
  faithfulness_frame: number | null;
}

interface ExplanationData {
  summary: { label: string; confidence: number; agreement: string; frames_analyzed: number; frames_skipped: number };
  models: ExplanationModel[];
  key_frames: Array<{ index: number; timestamp: string; score: number; reason: string }>;
  trend: { direction: string; first_half: number; second_half: number };
  spread_detail: { spread: number; outlier_key: string; outlier_score: number };
  caveats: string[];
}

interface AppState {
  videoId: string | null;
  fileName: string | null;
  uploadStatus: "idle" | "queued" | "processing" | "done" | "error";
  progress: string | null;
  error: string | null;
  verdict: VerdictData | null;
  evidence: EvidenceData | null;
  signals: SignalsData | null;
  timeline: TimelineData | null;
  explanation: ExplanationData | null;
}

interface DeepGuardContextType extends AppState {
  uploadFile: (file: File) => Promise<void>;
  reset: () => void;
  focusFrame: number | null;
  setFocusFrame: (index: number | null) => void;
}

const DeepGuardContext = createContext<DeepGuardContextType | null>(null);

export function DeepGuardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    videoId: null,
    fileName: null,
    uploadStatus: "idle",
    progress: null,
    error: null,
    verdict: null,
    evidence: null,
    signals: null,
    timeline: null,
    explanation: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [focusFrame, setFocusFrame] = useState<number | null>(null);

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
      // Non-fatal: videos analyzed before explanations existed (or older
      // backends) render the fallback block instead of failing the panel.
      const explanation = await api.getExplanation(videoId).catch(() => null);
      setState((prev) => ({ ...prev, verdict, evidence, signals, timeline, explanation }));
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
      fileName: file.name,
      uploadStatus: "queued",
      progress: null,
      error: null,
      verdict: null,
      evidence: null,
      signals: null,
      timeline: null,
      explanation: null,
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
      fileName: null,
      uploadStatus: "idle",
      progress: null,
      error: null,
      verdict: null,
      evidence: null,
      signals: null,
      timeline: null,
      explanation: null,
    });
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <DeepGuardContext.Provider
      value={{ ...state, uploadFile, reset, focusFrame, setFocusFrame }}
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

export type { VerdictData, EvidenceData, EvidenceFrame, SignalsData, TimelineData, TimelinePoint, ModelInfo, AppState, ExplanationData, ExplanationModel };