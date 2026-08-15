import React, { useState, useEffect, useRef } from "react";
import { X, Youtube, Tv, Upload, Play, AlertCircle, Link as LinkIcon, CheckCircle2, Flame, Loader2 } from "lucide-react";
import { VideoSourceData } from "../types";

interface SourceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSource: (source: VideoSourceData) => void;
}

export const SourceInputModal: React.FC<SourceInputModalProps> = ({
  isOpen,
  onClose,
  onSelectSource,
}) => {
  const [activeTab, setActiveTab] = useState<"url" | "upload" | "samples">("url");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleVideos, setSampleVideos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch preloaded samples from server
    fetch("/api/sample-videos")
      .then((res) => res.json())
      .then((data) => {
        if (data.videos) {
          setSampleVideos(data.videos);
        }
      })
      .catch((e) => console.warn("Samples load warning:", e));
  }, []);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage("Silakan masukkan URL YouTube, Twitch, atau Kick.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/extract-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses tautan video.");
      }

      const meta = data.metadata;
      onSelectSource({
        id: meta.id,
        title: meta.title,
        creator: meta.creator,
        platform: meta.platform,
        url: meta.url,
        videoUrl: meta.videoUrl,
        youtubeId: meta.youtubeId,
        embedUrl: meta.embedUrl,
        thumbnail: meta.thumbnail,
        duration: meta.duration,
        isLocalFile: false,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses URL.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check format
    if (!file.type.startsWith("video/")) {
      setErrorMessage("File harus berupa video (MP4, WebM, MOV, dll).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration) || 180;

      onSelectSource({
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        creator: "File Lokal",
        platform: "upload",
        url: file.name,
        videoUrl: objectUrl,
        duration: duration,
        isLocalFile: true,
      });

      setIsLoading(false);
      onClose();
    };

    tempVideo.onerror = () => {
      setErrorMessage("Tidak dapat memuat metadata file video ini.");
      setIsLoading(false);
    };
  };

  const handleSelectSample = (sample: any) => {
    onSelectSource({
      id: sample.id,
      title: sample.title,
      creator: sample.creator,
      platform: sample.platform,
      url: sample.url,
      videoUrl: sample.url,
      thumbnail: sample.thumbnail,
      duration: sample.duration,
      transcript: sample.simulatedTranscript,
      isLocalFile: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
              Pilih Sumber Video (Tanpa Batasan Durasi)
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
              Gunakan link YouTube, Twitch, Kick, upload video sendiri, atau pilih sampel langsung.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - Scrollable on mobile */}
        <div className="flex border-b border-neutral-800 px-3 sm:px-6 pt-2 bg-neutral-950/40 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            id="tab-source-url"
            onClick={() => {
              setActiveTab("url");
              setErrorMessage(null);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "url"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Tautan (YouTube / Twitch / Kick)
          </button>
          <button
            id="tab-source-upload"
            onClick={() => {
              setActiveTab("upload");
              setErrorMessage(null);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "upload"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Video MP4
          </button>
          <button
            id="tab-source-samples"
            onClick={() => {
              setActiveTab("samples");
              setErrorMessage(null);
            }}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "samples"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Flame className="w-4 h-4 text-orange-400" />
            Sampel Siap Pakai
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {activeTab === "url" && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Masukkan URL Video / Stream
                </label>
                <div className="relative">
                  <input
                    id="input-video-url"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... atau twitch.tv/... atau kick.com/..."
                    className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition pr-28"
                  />
                  <button
                    id="btn-submit-url"
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Muat Video"}
                  </button>
                </div>
              </div>

              {/* Supported platform cards */}
              <div className="grid grid-cols-4 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <Youtube className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-200">YouTube</span>
                  <span className="text-[9px] text-neutral-400">Video, Shorts & Live</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs">
                    MP4
                  </div>
                  <span className="text-[11px] font-bold text-neutral-200">Video Link / Stream</span>
                  <span className="text-[9px] text-neutral-400">MP4, WebM, CDN</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Tv className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-200">Twitch</span>
                  <span className="text-[9px] text-neutral-400">Clips & VODs</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-xs">
                    K
                  </div>
                  <span className="text-[11px] font-bold text-neutral-200">Kick</span>
                  <span className="text-[9px] text-neutral-400">Livestreams</span>
                </div>
              </div>

              {/* Quick test links */}
              <div className="bg-neutral-950/40 border border-neutral-800/60 rounded-xl p-3 space-y-2">
                <span className="text-[11px] text-neutral-400 font-medium">Contoh Link Siap Uji:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition font-semibold"
                  >
                    ▶ MP4 Langsung (Tears of Steel)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition font-semibold"
                  >
                    ▶ MP4 Langsung (Bigger Blazes)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("https://www.youtube.com/watch?v=ScMzIvxBSi4");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition"
                  >
                    YouTube (Sci-Fi Highlight)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition"
                  >
                    YouTube (Music Classic)
                  </button>
                </div>
              </div>

              {/* Fast Direct Upload Alternate Box */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-200">Punya file MP4 di komputer/HP Anda?</p>
                    <p className="text-[10px] text-neutral-400">Upload langsung bebas dari batasan embedding atau proteksi CORS.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium text-xs rounded-lg transition shrink-0 cursor-pointer border border-neutral-700"
                >
                  Pilih File MP4
                </button>
              </div>

              <p className="text-[11px] text-neutral-400 text-center">
                ⏱️ Batasan durasi maksimum 10 menit (600 detik) untuk analisis AI super cepat dan ekspor 4K 60fps tanpa lagging.
              </p>
            </form>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-amber-400/80 bg-neutral-950/50 hover:bg-neutral-950/90 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 transition cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Klik untuk pilih file atau Drag & Drop video di sini
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Mendukung format MP4, WebM, MOV (Maksimal durasi 10 menit)
                  </p>
                </div>
                <input
                  id="input-file-video"
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {activeTab === "samples" && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Pilih sampel video siap pakai untuk langsung menguji pencarian hook AI, watermark, vertical reframing, dan penggabungan video:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sampleVideos.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="group relative bg-neutral-950 border border-neutral-800 hover:border-amber-400/80 rounded-xl overflow-hidden p-2.5 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-800 mb-2">
                      <img
                        src={sample.thumbnail}
                        alt={sample.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <div className="w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold shadow-lg">
                          <Play className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-black/80 font-mono font-bold text-white px-1.5 py-0.5 rounded">
                        {Math.floor(sample.duration / 60)}:{(sample.duration % 60).toString().padStart(2, "0")}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {sample.platform}
                        </span>
                        <span className="text-[11px] text-neutral-400 truncate">{sample.creator}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                        {sample.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
