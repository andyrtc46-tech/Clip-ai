import React from "react";
import { Layers, ArrowUpDown, Trash2, Sliders, Scissors, MoveUp, MoveDown, Shuffle, Play, Film } from "lucide-react";
import { TransitionType, VideoClipSegment } from "../types";

interface MultiClipTimelineProps {
  clips: VideoClipSegment[];
  onUpdateClip: (id: string, updates: Partial<VideoClipSegment>) => void;
  onRemoveClip: (id: string) => void;
  onMoveClip: (index: number, direction: "up" | "down") => void;
  onSelectClipToPlay: (clip: VideoClipSegment) => void;
  activeClipId: string | null;
  globalTransition: TransitionType;
  onChangeGlobalTransition: (trans: TransitionType) => void;
}

export const MultiClipTimeline: React.FC<MultiClipTimelineProps> = ({
  clips,
  onUpdateClip,
  onRemoveClip,
  onMoveClip,
  onSelectClipToPlay,
  activeClipId,
  globalTransition,
  onChangeGlobalTransition,
}) => {
  const selectedClips = clips.filter((c) => c.isSelected);
  const totalDuration = selectedClips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-4 shadow-xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base">Timeline Penggabungan Klip Otomatis</h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Gabungkan beberapa potongan video menjadi 1 video utuh dengan transisi halus otomatis.
          </p>
        </div>

        {/* Total merged duration badge */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
          <span className="text-xs text-neutral-400">Total Durasi Gabungan:</span>
          <span className="text-sm font-extrabold text-amber-400 font-mono">
            {formatSec(totalDuration)}
          </span>
          <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-semibold">
            {selectedClips.length} Klip
          </span>
        </div>
      </div>

      {/* Global Transition Selector */}
      <div className="flex items-center justify-between gap-2 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <Shuffle className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">Transisi Halus Antar Klip:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["crossfade", "dip-black", "wipe", "cut"] as TransitionType[]).map((t) => (
            <button
              key={t}
              onClick={() => onChangeGlobalTransition(t)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                globalTransition === t
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {t === "crossfade"
                ? "✨ Crossfade"
                : t === "dip-black"
                ? "🎬 Dip to Black"
                : t === "wipe"
                ? "💨 Wipe"
                : "⚡ Hard Cut"}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Clips List */}
      {selectedClips.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-neutral-950/40 rounded-xl border border-neutral-800/80 border-dashed">
          <Film className="w-6 h-6 text-neutral-500" />
          <p className="text-sm font-semibold text-neutral-300">Belum ada klip yang dipilih untuk digabungkan</p>
          <p className="text-xs text-neutral-500">
            Pilih klip dari panel AI Hook di atas untuk menyatukannya menjadi satu kesatuan video.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {selectedClips.map((clip, index) => {
            const isPlaying = activeClipId === clip.id;
            const clipDuration = Math.max(0, clip.endTime - clip.startTime);

            return (
              <div
                key={clip.id}
                className={`p-3 rounded-xl border transition flex flex-col gap-3 ${
                  isPlaying
                    ? "bg-neutral-800/90 border-amber-400/80 ring-1 ring-amber-400/40"
                    : "bg-neutral-950/80 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {/* Header of clip row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/30">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-md">
                      {clip.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Move up / down */}
                    <button
                      onClick={() => onMoveClip(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 cursor-pointer"
                      title="Pindah ke Atas / Urutan Awal"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onMoveClip(index, "down")}
                      disabled={index === selectedClips.length - 1}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 cursor-pointer"
                      title="Pindah ke Bawah / Urutan Akhir"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    {/* Remove */}
                    <button
                      onClick={() => onRemoveClip(clip.id)}
                      className="p-1 rounded bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 cursor-pointer transition"
                      title="Hapus dari Gabungan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Trim Slider & Numerical In/Out Points */}
                <div className="bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-300">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Mulai:</span>
                      <input
                        type="number"
                        min={0}
                        max={clip.endTime - 1}
                        value={Math.round(clip.startTime)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onUpdateClip(clip.id, { startTime: val, duration: clip.endTime - val });
                        }}
                        className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                      />
                      <span className="text-neutral-500">detik</span>
                    </div>

                    <div className="text-amber-400 font-bold font-mono">
                      ⏱️ {formatSec(clipDuration)} ({Math.round(clipDuration)}s)
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Selesai:</span>
                      <input
                        type="number"
                        min={clip.startTime + 1}
                        value={Math.round(clip.endTime)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onUpdateClip(clip.id, { endTime: val, duration: val - clip.startTime });
                        }}
                        className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs outline-none"
                      />
                      <span className="text-neutral-500">detik</span>
                    </div>
                  </div>

                  {/* Range visual bar */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => onSelectClipToPlay(clip)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-amber-400 fill-current" />
                      <span>Preview Potongan Ini</span>
                    </button>

                    {/* Speed selector for this clip */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 ml-auto">
                      <span>Kecepatan:</span>
                      <select
                        value={clip.speed || 1.0}
                        onChange={(e) => onUpdateClip(clip.id, { speed: Number(e.target.value) })}
                        className="bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
                      >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
