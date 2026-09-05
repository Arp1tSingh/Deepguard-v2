"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, X, Sparkles } from "lucide-react";
import { useDeepGuard } from "./DeepGuardProvider";

const MAX_SIZE = 500 * 1024 * 1024;
const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];

export function Dropzone() {
  const { uploadFile, uploadStatus, progress, error: ctxError, reset } = useDeepGuard();
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
    if (uploadStatus === "done") {
      const element = document.getElementById("verdict");
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }
  }, [uploadStatus]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-zinc-700 inline-block" />
        Upload Video
      </h2>

      <AnimatePresence>
        {fileName && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center justify-between p-4 rounded-xl glass-card">
            <div className="flex items-center gap-3">
              <FileVideo className="w-5 h-5 text-[var(--accent)]" />
              <span className="text-sm text-zinc-200">{fileName}</span>
              {isProcessing && (
                <span className="text-xs text-[var(--accent)] animate-pulse">{progress || "Queued..."}</span>
              )}
            </div>
            <button onClick={handleClear} className="p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`relative glass-card rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 interactive-card ${
          isDragging
            ? "border-[var(--accent)]"
            : error || ctxError
            ? "border-[var(--fake)]"
            : isProcessing
            ? "border-[var(--accent)]"
            : ""
        }`}
      >
        <input ref={fileRef} type="file" accept="video/*,.mp4,.webm,.mov" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
        {(error || ctxError) ? (
          <div className="animate-fade-in-up">
            <X className="w-12 h-12 mx-auto text-[var(--fake)] mb-3" />
            <p className="text-[var(--fake)] font-medium text-lg">{ctxError || error}</p>
            <p className="text-zinc-500 text-sm mt-2">Click to try again</p>
          </div>
        ) : isProcessing ? (
          <div className="animate-fade-in-up">
            <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--accent)] animate-pulse" />
            <p className="text-xl font-semibold mb-1 text-[var(--accent)]">
              {progress || "Analyzing..."}
            </p>
            <p className="text-sm text-zinc-500">This may take 25-30 seconds</p>
            <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-[var(--accent)] rounded-full"
                animate={{ width: ["10%", "30%", "10%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        ) : (
          <div>
            <motion.div animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${isDragging ? "text-[var(--accent)]" : "text-zinc-600"}`} />
            </motion.div>
            <p className="text-xl font-semibold mb-1 text-zinc-200">
              Drag & drop your video
            </p>
            <p className="text-sm text-zinc-500 font-mono">MP4, WebM, MOV · Max 500MB</p>
            {!isDragging && !isProcessing && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-600">
                <Sparkles className="w-3 h-3" />
                <span>or click to browse</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}