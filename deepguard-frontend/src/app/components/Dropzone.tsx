"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, X, Sparkles, Loader2 } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

const MAX_SIZE = 500 * 1024 * 1024;
const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];

export function Dropzone() {
  const { uploadFile, uploadStatus, progress, error: ctxError, reset, verdict } = useDeepGuard();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("Unsupported format. Use .mp4, .webm or .mov");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File too large. Max 500MB.");
      return;
    }
    setFileName(file.name);
    await uploadFile(file);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleClear = () => {
    reset();
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isProcessing = uploadStatus === "queued" || uploadStatus === "processing";

  useEffect(() => {
    // When finished, scroll down smoothly to the details section,
    // assuming they'll want to see the deeper reports. The Compact verdict is already above.
    if (uploadStatus === "done" && verdict) {
      const element = document.getElementById("verdict");
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }
  }, [uploadStatus, verdict]);

  return (
    <div className="h-full">
      {/* Remove the H2 here because we grouped it in the two-column hero where it serves as the action block */
       !verdict && (
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-zinc-200">
          Upload Video
        </h2>
       )
      }

      <AnimatePresence>
        {fileName && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
            className="mb-6 flex items-center justify-between p-4 nested-card">
            <div className="flex items-center gap-3">
              <FileVideo className="w-5 h-5 text-[var(--accent)]" />
              <span className="text-sm font-mono text-zinc-200">{fileName}</span>
              {isProcessing && (
                <span className="text-xs text-[var(--accent)] font-mono animate-pulse">{progress || "Queued..."}</span>
              )}
            </div>
            <button onClick={handleClear} className="p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative glass-card h-64 border-dashed border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer interactive-card ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : error || ctxError
            ? "border-[var(--fake)] bg-[var(--fake)]/5"
            : isProcessing
            ? "border-[var(--accent)]/30 border-solid"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.01]"
        }`}
      >
        <input ref={fileRef} type="file" accept="video/*,.mp4,.webm,.mov" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
        {(error || ctxError) ? (
          <div className="animate-fade-in text-center">
            <X className="w-10 h-10 mx-auto text-[var(--fake)] mb-3" />
            <p className="text-[var(--fake)] font-medium text-base mb-1">{ctxError || error}</p>
            <p className="text-zinc-500 text-xs">Click to try again</p>
          </div>
        ) : isProcessing ? (
          <div className="animate-fade-in text-center w-full max-w-[200px] mx-auto">
            <Loader2 className="w-10 h-10 mx-auto mb-4 text-[var(--accent)] animate-spin" />
            <p className="text-base font-semibold mb-1 text-zinc-100">
              {progress || "Analyzing..."}
            </p>
            <p className="text-xs text-zinc-500 font-mono">Est 25-30s</p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className={`w-10 h-10 mx-auto mb-4 transition-colors duration-150 ${isDragging ? "text-[var(--accent)]" : "text-zinc-500"}`} />
            <p className="text-base font-medium mb-1 text-zinc-200">
              {isDragging ? "Drop your video here" : "Drag & drop your video"}
            </p>
            <p className="text-xs text-zinc-500 font-mono mb-4">MP4, WebM, MOV · Max 500MB</p>
            {!isDragging && !isProcessing && (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-md">
                <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                <span>Browse files</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
