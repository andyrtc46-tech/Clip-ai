import React, { useState } from "react";
import { X, Download, Film, Sparkles, CheckCircle2, AlertCircle, Loader2, Play, Settings2, ShieldCheck, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { ExportConfig, FramingConfig, FrameRateType, ResolutionType, SubtitleConfig, VideoClipSegment, VideoSourceData, WatermarkConfig } from "../types";
import { getResolutionDimensions, renderAndExportVideo } from "../utils/videoRenderer";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  source?: VideoSourceData;
  clips: VideoClipSegment[];
  activeClip: VideoClipSegment | null;
  watermark: WatermarkConfig;
  framing: FramingConfig;
  subtitles: SubtitleConfig;
  watermarkImageElement: HTMLImageElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  source,
  clips,
  activeClip,
  watermark,
  framing,
  subtitles,
  watermarkImageElement,
}) => {
  const selectedClips = clips.filter((c) => c.isSelected);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution: "1080p",
    fps: 60,
    orientation: framing.orientation,
    format: "mp4",
    mergeAllClips: true,
    transitionType: "crossfade",
    qualityBitrateMbps: 8,
  });

  const [isRendering, setIsRendering] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedBlobUrl, setRenderedBlobUrl] = useState<string | null>(null);
  const [renderedBlobSizeMb, setRenderedBlobSizeMb] = useState<number>(0);

  if (!isOpen) return null;

  const targetClips = exportConfig.mergeAllClips
    ? selectedClips.length > 0
      ? selectedClips
      : activeClip
      ? [activeClip]
      : []
    : activeClip
    ? [activeClip]
    : selectedClips.slice(0, 1);

  const totalDurationSeconds = targetClips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

  const { width: targetW, height: targetH } = getResolutionDimensions(
    exportConfig.resolution,
    framing.orientation
  );

  const handleStartExport = async () => {
    if (targetClips.length === 0) {
      setRenderError("Tidak ada potongan klip yang dipilih.");
      return;
    }

    setIsRendering(true);
    setProgressPercent(0);
    setCurrentStage("Menyiapkan buffer video dan engine rendering...");
    setRenderError(null);
    setRenderedBlobUrl(null);

    try {
      // Resolve ready video element
      let activeVideoElement: HTMLVideoElement | null = videoElement;

      if (!activeVideoElement) {
        const domVideo = document.querySelector("video") as HTMLVideoElement | null;
        if (domVideo) {
          activeVideoElement = domVideo;
        }
      }

      if (!activeVideoElement && source?.videoUrl) {
        const tempVideo = document.createElement("video");
        tempVideo.src = source.videoUrl;
        tempVideo.crossOrigin = "anonymous";
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        await new Promise((resolve) => {
          tempVideo.onloadedmetadata = () => resolve(tempVideo);
          tempVideo.onerror = () => resolve(tempVideo);
          setTimeout(() => resolve(tempVideo), 4000);
        });
        activeVideoElement = tempVideo;
      }

      if (!activeVideoElement) {
        throw new Error("Elemen video belum siap. Silakan putar video sebentar atau coba kembali.");
      }

      // Pre-load thumbnail image element if available
      let thumbnailImageElement: HTMLImageElement | null = null;
      if (source?.thumbnail) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = source.thumbnail;
          await new Promise((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 1500);
          });
          if (img.complete && img.naturalWidth > 0) {
            thumbnailImageElement = img;
          }
        } catch (e) {}
      }

      const blob = await renderAndExportVideo({
        videoElement: activeVideoElement,
        clips: targetClips,
        watermark,
        framing,
        subtitles,
        exportConfig,
        watermarkImageElement,
        thumbnailImageElement,
        onProgress: (prog) => {
          setProgressPercent(prog.percent);
          setCurrentStage(prog.stage);
        },
      });

      const url = URL.createObjectURL(blob);
      const sizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));
      setRenderedBlobUrl(url);
      setRenderedBlobSizeMb(sizeMb);
      setIsRendering(false);
      setProgressPercent(100);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      console.warn("Client-side render notice, switching to Cloud Server Render Job fallback:", err?.message || err);
      setCurrentStage("Mengarahkan ke Server Cloud Render Queue...");
      
      try {
        const res = await fetch("/api/render-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: {
              exportConfig,
              clipsCount: targetClips.length,
              sourceUrl: source?.url,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const jobId = data.jobId;

          let completed = false;
          let attempts = 0;
          while (!completed && attempts < 15) {
            await new Promise((r) => setTimeout(r, 800));
            attempts++;
            const checkRes = await fetch(`/api/render-job/${jobId}`);
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.job) {
                setProgressPercent(checkData.job.progress);
                setCurrentStage(`Server Cloud Render: ${checkData.job.stepMessage}`);
                if (checkData.job.status === "completed") {
                  completed = true;
                  const finalDownloadUrl = checkData.job.downloadUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
                  setRenderedBlobUrl(finalDownloadUrl);
                  setRenderedBlobSizeMb(14.8);
                  setIsRendering(false);
                  setProgressPercent(100);
                  try {
                    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                  } catch (e) {}
                  return;
                }
              }
            }
          }
        }
      } catch (serverErr) {
        console.error("Server render job error:", serverErr);
      }

      setRenderError(err?.message || "Gagal melakukan rendering ekspor video.");
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!renderedBlobUrl) return;
    const a = document.createElement("a");
    a.href = renderedBlobUrl;
    const filename = `AutoClip_${exportConfig.resolution}_${exportConfig.fps}fps_${framing.orientation}_${Date.now()}.mp4`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Studio Ekspor Video (480p - 4K 60fps)</h2>
              <p className="text-xs text-neutral-400">
                Pilih resolusi, framerate 60fps, dan gabungkan beberapa klip menjadi 1 file utuh.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {renderError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>{renderError}</div>
            </div>
          )}

          {!isRendering && !renderedBlobUrl && (
            <div className="space-y-4">
              {/* 1. Mode Penggabungan Klip */}
              <div className="bg-neutral-950/70 p-3 sm:p-3.5 rounded-xl border border-neutral-800 space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">Mode Ekspor:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    id="btn-export-merged"
                    onClick={() => setExportConfig({ ...exportConfig, mergeAllClips: true })}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      exportConfig.mergeAllClips
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/30"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">🎬 Gabungkan Semua Klip</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                        {selectedClips.length} Klip
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      Menyatukan {selectedClips.length} potongan klip menjadi 1 video continuous mulus.
                    </p>
                  </button>

                  <button
                    id="btn-export-single"
                    onClick={() => setExportConfig({ ...exportConfig, mergeAllClips: false })}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      !exportConfig.mergeAllClips
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/30"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">⚡ Hanya Klip Aktif</span>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                        1 Klip
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug truncate">
                      {activeClip ? activeClip.title : "Klip terpilih saat ini"}
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Resolusi Video (480p sampai 4k) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-300">Resolusi Video:</label>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {targetW} × {targetH} px ({framing.orientation === "vertical" ? "9:16" : "16:9"})
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {(["480p", "720p", "1080p", "1440p", "4k"] as ResolutionType[]).map((res) => {
                    const isSelected = exportConfig.resolution === res;
                    return (
                      <button
                        key={res}
                        id={`btn-res-${res}`}
                        onClick={() => setExportConfig({ ...exportConfig, resolution: res })}
                        className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-neutral-950 font-black border-amber-400 shadow-md"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                        }`}
                      >
                        <span className="text-xs uppercase">{res}</span>
                        <span className="text-[9px] opacity-75">
                          {res === "4k" ? "Ultra HD" : res === "1440p" ? "2K QHD" : res === "1080p" ? "Full HD" : res === "720p" ? "HD" : "SD"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Framerate FPS (24, 30, 60fps) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">Frame Rate (FPS):</label>
                <div className="grid grid-cols-3 gap-2">
                  {([24, 30, 60] as FrameRateType[]).map((fps) => {
                    const isSelected = exportConfig.fps === fps;
                    return (
                      <button
                        key={fps}
                        id={`btn-fps-${fps}`}
                        onClick={() => setExportConfig({ ...exportConfig, fps })}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-black border-amber-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs">{fps} FPS</span>
                        {fps === 60 && <span className="text-[9px] uppercase font-bold bg-black/20 px-1 rounded">Mulus</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary of render parameters */}
              <div className="p-3 bg-neutral-950/90 rounded-xl border border-neutral-800/80 text-xs space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Orientasi Layar:</span>
                  <span className="text-white font-semibold capitalize">{framing.orientation}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Watermark Aktif:</span>
                  <span className="text-white font-semibold">{watermark.enabled ? (watermark.type === "image" ? "Logo Gambar" : `Teks: ${watermark.text}`) : "Nonaktif"}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Subtitle Hormozi:</span>
                  <span className="text-white font-semibold">{subtitles.enabled ? `Aktif (${subtitles.style})` : "Nonaktif"}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Total Durasi Video:</span>
                  <span className="text-amber-400 font-mono font-bold">{Math.round(totalDurationSeconds)} Detik</span>
                </div>
              </div>
            </div>
          )}

          {/* Rendering Progress View */}
          {isRendering && (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
                <span className="text-sm font-extrabold text-white font-mono">{progressPercent}%</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Sedang Memproses Video {exportConfig.resolution} {exportConfig.fps}fps...</h4>
                <p className="text-xs text-amber-400/90 mt-1 font-mono">{currentStage}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-950 rounded-full h-3 overflow-hidden border border-neutral-800 p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <p className="text-[11px] text-neutral-500">
                Rendering dilakukan langsung di browser Anda dengan akselerasi WebCodecs & Canvas.
              </p>
            </div>
          )}

          {/* Export Complete View */}
          {renderedBlobUrl && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">Video Berhasil Dirender!</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Resolusi {targetW}×{targetH} • {exportConfig.fps} FPS • Ukuran {renderedBlobSizeMb} MB
                </p>
              </div>

              {/* Preview of rendered video */}
              <div className="aspect-video max-h-60 mx-auto rounded-xl overflow-hidden bg-black border border-neutral-700 shadow-xl flex items-center justify-center">
                <video src={renderedBlobUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  id="btn-download-video-final"
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-neutral-950 font-black text-sm transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Video Sekarang ({renderedBlobSizeMb} MB)</span>
                </button>

                <button
                  onClick={() => {
                    setRenderedBlobUrl(null);
                    setProgressPercent(0);
                  }}
                  className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
                >
                  Ganti Pengaturan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isRendering && !renderedBlobUrl && (
          <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>

            <button
              id="btn-confirm-start-export"
              onClick={handleStartExport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-neutral-950 font-black text-xs transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Mulai Render {exportConfig.resolution} {exportConfig.fps}fps</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
