const BASE = process.env.NEXT_PUBLIC_DEEPGUARD_API_URL ?? "";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  uploadVideo(file: File): Promise<{ video_id: string; status: string }> {
    const form = new FormData();
    form.append("file", file);
    // Don't set Content-Type header manually for FormData, browser sets it with boundaries
    const url = `${BASE}/api/upload`;
    return fetch(url, { method: "POST", body: form }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },

  getStatus(videoId: string): Promise<{ status: string; progress: string | null; error?: string }> {
    return request(`/api/videos/${videoId}/status`);
  },

  getVerdict(videoId: string): Promise<{
    label: string;
    confidence: number;
    agreement: string;
    models: Array<{ key: string; name: string; score: number; verified: boolean; note: string }>;
  }> {
    return request(`/api/videos/${videoId}/verdict`);
  },

  getEvidence(videoId: string): Promise<{
    original_video_url: string;
    frames: Array<{
      timestamp: string;
      time_sec: number;
      face_detected: boolean;
      face_confidence: number | null;
      original_frame_url: string | null;
      heatmap_url: string | null;
    }>;
  }> {
    return request(`/api/videos/${videoId}/evidence`);
  },

  getSignals(videoId: string): Promise<{
    models: Array<{ name: string; score: number }>;
    agreement: string;
    agreement_spread: number;
  }> {
    return request(`/api/videos/${videoId}/signals`);
  },

  getTimeline(videoId: string): Promise<{
    duration_sec: number;
    points: Array<{ time_sec: number; timestamp: string; xception: number; spsl: number; ucf: number }>;
  }> {
    return request(`/api/videos/${videoId}/timeline`);
  },

  async exportPDF(videoId: string): Promise<Blob> {
    let r: Response;
    try {
      r = await fetch(`${BASE}/api/videos/${videoId}/export`);
    } catch {
      throw new Error(
        `Cannot reach backend at ${BASE || "(no API URL configured)"} — is it running?`
      );
    }
    if (!r.ok) {
      const body = await r.json().catch(() => null);
      const detail =
        body && typeof body.detail === "string" ? body.detail : null;
      throw new Error(detail || `Export failed (HTTP ${r.status})`);
    }
    return r.blob();
  },

  getOriginalVideoUrl(videoId: string): string {
    return `${BASE}/api/videos/${videoId}/original`;
  },

  getFrameOriginalUrl(videoId: string, index: number): string {
    return `${BASE}/api/videos/${videoId}/frames/${index}/original`;
  },

  getFrameHeatmapUrl(videoId: string, index: number, model?: string): string {
    const base = `${BASE}/api/videos/${videoId}/frames/${index}/heatmap`;
    return model && model !== "xception" ? `${base}?model=${model}` : base;
  },
};