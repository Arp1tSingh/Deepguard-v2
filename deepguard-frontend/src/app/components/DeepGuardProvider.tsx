"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface SignalData {
  textureDeficit: number;
  frequencyArtifacts: number;
  lightingInconsistency: number;
  biometricAbnormality: number;
  compressionArtifacts: number;
  noiseLevel: number;
  corroborationScore: number;
}

interface TimelinePoint {
  timestamp: number;
  confidence: number;
}

interface AnalysisState {
  isAnalyzing: boolean;
  uploadProgress: number;
  verdict: "real" | "fake" | null;
  confidence: number;
  isEstimate: boolean;
  videoUrl: string | null;
  fileName: string | null;
  signals: SignalData | null;
  timelineData: TimelinePoint[] | null;
}

interface DeepGuardContextType extends AnalysisState {
  setUploadProgress: (p: number) => void;
  setVerdict: (v: "real" | "fake" | null, confidence: number, isEstimate: boolean) => void;
  setVideoData: (url: string | null, name: string | null) => void;
  setSignals: (s: SignalData) => void;
  setTimelineData: (t: TimelinePoint[]) => void;
  setIsAnalyzing: (v: boolean) => void;
  reset: () => void;
}

const DeepGuardContext = createContext<DeepGuardContextType | null>(null);

export function DeepGuardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    uploadProgress: 0,
    verdict: null,
    confidence: 0,
    isEstimate: false,
    videoUrl: null,
    fileName: null,
    signals: null,
    timelineData: null,
  });

  const setUploadProgress = useCallback((p: number) => {
    setState((s) => ({ ...s, uploadProgress: p }));
  }, []);

  const setVerdict = useCallback((v: "real" | "fake" | null, confidence: number, isEstimate: boolean) => {
    setState((s) => ({ ...s, verdict: v, confidence, isEstimate }));
  }, []);

  const setVideoData = useCallback((url: string | null, name: string | null) => {
    setState((s) => ({ ...s, videoUrl: url, fileName: name }));
  }, []);

  const setSignals = useCallback((s: SignalData) => {
    setState((s2) => ({ ...s2, signals: s }));
  }, []);

  const setTimelineData = useCallback((t: TimelinePoint[]) => {
    setState((s) => ({ ...s, timelineData: t }));
  }, []);

  const setIsAnalyzing = useCallback((v: boolean) => {
    setState((s) => ({ ...s, isAnalyzing: v }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      uploadProgress: 0,
      verdict: null,
      confidence: 0,
      isEstimate: false,
      videoUrl: null,
      fileName: null,
      signals: null,
      timelineData: null,
    });
  }, []);

  return (
    <DeepGuardContext.Provider
      value={{
        ...state,
        setUploadProgress,
        setVerdict,
        setVideoData,
        setSignals,
        setTimelineData,
        setIsAnalyzing,
        reset,
      }}
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

export type { SignalData, TimelinePoint, AnalysisState };
