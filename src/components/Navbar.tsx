import React from "react";
import { Sparkles, Video, Film, Scissors, Download, ShieldAlert, Youtube, Tv, Smartphone } from "lucide-react";
import { VideoSourceData } from "../types";

interface NavbarProps {
  currentSource: VideoSourceData | null;
  onOpenSourceModal: () => void;
  onOpenExportModal: () => void;
  onOpenMobileAppModal?: () => void;
  selectedClipsCount: number;
  totalDurationSeconds: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSource,
  onOpenSourceModal,
  onOpenExportModal,
  onOpenMobileAppModal,
  selectedClipsCount,
  totalDurationSeconds,
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 text-neutral-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-white/10 shrink-0">
            <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold tracking-tight text-base sm:text-lg text-white">AutoClip <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">AI</span></span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO HOOK
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden md:block">
              Auto Clip, Viral Hook Detector & 4K 60fps Multi-Stitch
            </p>
          </div>
        </div>

        {/* Status / Active Video Badge */}
        {currentSource ? (
          <div className="hidden lg:flex items-center gap-3 bg-neutral-800/80 px-3.5 py-1.5 rounded-xl border border-neutral-700/60 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300">
              {currentSource.platform === "youtube" && <Youtube className="w-4 h-4 text-red-500" />}
              {currentSource.platform === "twitch" && <Tv className="w-4 h-4 text-purple-400" />}
              {currentSource.platform === "kick" && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>}
              {currentSource.platform === "upload" && <Film className="w-4 h-4 text-cyan-400" />}
              <span className="font-medium truncate max-w-[180px] text-white">{currentSource.title}</span>
            </div>
            <span className="text-neutral-500">•</span>
            <div className="text-neutral-400 flex items-center gap-1">
              <span>{formatTime(currentSource.duration)}</span>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                Tanpa Batasan Durasi
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 bg-neutral-800/40 px-3 py-1 rounded-lg border border-neutral-800">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Mendukung YouTube, Twitch, Kick & File MP4 (Tanpa Batasan Durasi)</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onOpenMobileAppModal && (
            <button
              id="btn-mobile-app-install"
              onClick={onOpenMobileAppModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition border border-amber-500/30 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="hidden md:inline">App Android & iOS</span>
              <span className="md:hidden">App HP</span>
            </button>
          )}

          <button
            id="btn-import-source"
            onClick={onOpenSourceModal}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-neutral-200 text-xs sm:text-sm font-medium transition border border-neutral-700 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Pilih / Ganti Video</span>
            <span className="sm:hidden">Sumber</span>
          </button>

          <button
            id="btn-export-video"
            onClick={onOpenExportModal}
            disabled={!currentSource || selectedClipsCount === 0}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shadow-md ${
              currentSource && selectedClipsCount > 0
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white shadow-orange-500/20 active:scale-95"
                : "bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed"
            }`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Export</span>
            {selectedClipsCount > 0 && (
              <span className="text-[10px] sm:text-xs bg-black/30 px-1.5 py-0.5 rounded-full font-bold">
                {selectedClipsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
