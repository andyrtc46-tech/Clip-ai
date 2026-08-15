import React from "react";
import { Smartphone, Monitor, Square, Sparkles, Sliders, Type, SplitSquareVertical, Palette } from "lucide-react";
import { FramingConfig, OrientationType, SubtitleConfig } from "../types";

interface FramingAndCaptionsProps {
  framing: FramingConfig;
  onChangeFraming: (updates: Partial<FramingConfig>) => void;
  subtitles: SubtitleConfig;
  onChangeSubtitles: (updates: Partial<SubtitleConfig>) => void;
}

export const FramingAndCaptions: React.FC<FramingAndCaptionsProps> = ({
  framing,
  onChangeFraming,
  subtitles,
  onChangeSubtitles,
}) => {
  const orientations: { key: OrientationType; label: string; sub: string; icon: any }[] = [
    { key: "vertical", label: "9:16 Vertikal", sub: "TikTok / Shorts / Reels", icon: Smartphone },
    { key: "horizontal", label: "16:9 Horizontal", sub: "YouTube / Twitch / Kick", icon: Monitor },
    { key: "square", label: "1:1 Persegi", sub: "Instagram Post", icon: Square },
  ];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-5 shadow-xl w-full">
      {/* 1. Framing / Aspect Ratio Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Format Layar & Reframing</h3>
            <p className="text-xs text-neutral-400">Pilih orientasi vertikal 9:16 untuk video pendek atau horizontal 16:9.</p>
          </div>
        </div>

        {/* Orientation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {orientations.map((item) => {
            const Icon = item.icon;
            const isSelected = framing.orientation === item.key;
            return (
              <button
                key={item.key}
                id={`btn-orientation-${item.key}`}
                onClick={() => onChangeFraming({ orientation: item.key })}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-emerald-400" : "text-neutral-400"}`} />
                <span className="text-xs font-bold text-white">{item.label}</span>
                <span className="text-[10px] text-neutral-400">{item.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Extra Vertical Reframing Options */}
        {framing.orientation === "vertical" && (
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800/80 space-y-2.5">
            <span className="text-xs font-semibold text-neutral-300">Mode Tampilan Vertikal 9:16:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onChangeFraming({ backgroundMode: "blur", splitScreen: false })}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                  framing.backgroundMode === "blur" && !framing.splitScreen
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                ✨ Blurred Stream
              </button>
              <button
                onClick={() => onChangeFraming({ backgroundMode: "crop", splitScreen: false })}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                  framing.backgroundMode === "crop" && !framing.splitScreen
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                🎯 Center Crop
              </button>
              <button
                onClick={() => onChangeFraming({ splitScreen: true })}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                  framing.splitScreen
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                📱 Split Screen Cam
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Subtitles & Captions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Subtitle & Captions Otomatis</h3>
              <p className="text-xs text-neutral-400">Teks animasi dengan warna pop untuk menaikkan retensi penonton.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="toggle-subtitles"
              type="checkbox"
              checked={subtitles.enabled}
              onChange={(e) => onChangeSubtitles({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {subtitles.enabled && (
          <div className="space-y-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
            {/* Style presets */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Gaya Subtitle</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    onChangeSubtitles({
                      style: "hormozi",
                      textColor: "#FFFFFF",
                      highlightColor: "#FFE600",
                      uppercase: true,
                    })
                  }
                  className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition cursor-pointer ${
                    subtitles.style === "hormozi"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  ⚡ Alex Hormozi
                </button>
                <button
                  onClick={() =>
                    onChangeSubtitles({
                      style: "mrbeast",
                      textColor: "#00FFF0",
                      highlightColor: "#FF0077",
                      uppercase: true,
                    })
                  }
                  className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition cursor-pointer ${
                    subtitles.style === "mrbeast"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  🔥 MrBeast Neon
                </button>
                <button
                  onClick={() =>
                    onChangeSubtitles({
                      style: "clean",
                      textColor: "#FFFFFF",
                      highlightColor: "#38BDF8",
                      uppercase: false,
                    })
                  }
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                    subtitles.style === "clean"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  ✨ Minimalist
                </button>
              </div>
            </div>

            {/* Position & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>Ukuran Font:</span>
                  <span className="text-white font-mono">{subtitles.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={48}
                  value={subtitles.fontSize}
                  onChange={(e) => onChangeSubtitles({ fontSize: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>Posisi Y (Vertikal):</span>
                  <span className="text-white font-mono">{subtitles.positionY}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={90}
                  value={subtitles.positionY}
                  onChange={(e) => onChangeSubtitles({ positionY: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
