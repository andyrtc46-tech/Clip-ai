import React, { useState } from "react";
import { Sparkles, Flame, Play, Plus, Check, Zap, Target, Loader2, ArrowRight, HelpCircle } from "lucide-react";
import { HookCategory, VideoClipSegment, VideoSourceData } from "../types";

interface AiHookDetectorPanelProps {
  source: VideoSourceData;
  detectedClips: VideoClipSegment[];
  onClipsDetected: (clips: VideoClipSegment[], summary: string) => void;
  activeClipId: string | null;
  onSelectClipToPlay: (clip: VideoClipSegment) => void;
  onToggleClipInTimeline: (clip: VideoClipSegment) => void;
  onAutoSelectTopClips: () => void;
}

export const AiHookDetectorPanel: React.FC<AiHookDetectorPanelProps> = ({
  source,
  detectedClips,
  onClipsDetected,
  activeClipId,
  onSelectClipToPlay,
  onToggleClipInTimeline,
  onAutoSelectTopClips,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userGoal, setUserGoal] = useState<string>("Viral Hook dengan Retensi Tinggi (TikTok / Shorts)");
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisSummary(null);

    try {
      const response = await fetch("/api/analyze-video-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: source.title,
          platform: source.platform,
          duration: source.duration,
          transcript: source.transcript || null,
          userCustomGoal: userGoal,
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const rawClips = resData.data.clips || [];
        const formattedClips: VideoClipSegment[] = rawClips.map((c: any, index: number) => ({
          id: c.id || `clip-${Date.now()}-${index}`,
          title: c.title || `Viral Hook Clip #${index + 1}`,
          hookCategory: (c.hookCategory as HookCategory) || "Shock",
          startTime: Math.max(0, Math.min(Number(c.startTime) || 0, source.duration - 5)),
          endTime: Math.min(Number(c.endTime) || Math.min(source.duration, 45), source.duration),
          duration: (Number(c.endTime) || 30) - (Number(c.startTime) || 0),
          viralScore: Number(c.viralScore) || 90,
          hookSentence: c.hookSentence || "Watch this moment carefully!",
          whyItWorks: c.whyItWorks || "High-intensity trigger keeping viewer attention in the first 3 seconds.",
          emotion: c.emotion || "Intense",
          suggestedSubtitles: c.suggestedSubtitles || [
            { start: 0, end: 2.5, text: c.hookSentence || "PAY ATTENTION TO THIS!", highlight: "ATTENTION" },
          ],
          speed: 1.0,
          volume: 1.0,
          transition: "crossfade",
          isSelected: true, // auto selected for timeline merge by default
        }));

        setAnalysisSummary(resData.data.summary || "AI telah mengekstrak momen hook terbaik untuk klip viral.");
        onClipsDetected(formattedClips, resData.data.summary);
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 90) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  };

  const getCategoryBadge = (category: HookCategory) => {
    const map: Record<HookCategory, { label: string; color: string }> = {
      Shock: { label: "⚡ Shock Hook", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
      Curiosity: { label: "🧐 Curiosity Hook", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
      Story: { label: "📖 Story Hook", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
      Question: { label: "❓ Question Hook", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
      Punchline: { label: "😂 Punchline / Lucu", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
      Controversial: { label: "🔥 Kontroversial", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
    };
    const info = map[category] || map.Shock;
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 shadow-xl w-full">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">AI Viral Hook & Moment Detector</h3>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
            Gemini AI menganalisis transkrip, intonasi, dan momentum untuk mendeteksi 3 detik pembuka paling viral.
          </p>
        </div>

        <button
          id="btn-run-ai-hook"
          onClick={handleRunAiAnalysis}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-neutral-950 font-extrabold text-xs transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
              <span>Memindai Hook Video...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>{detectedClips.length > 0 ? "Analisis Ulang AI" : "Cari Hook Otomatis"}</span>
            </>
          )}
        </button>
      </div>

      {/* Goal Strategy Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800 text-xs">
        <div className="flex items-center gap-1.5 shrink-0 text-neutral-400 font-medium">
          <Target className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Target Gaya:</span>
        </div>
        <select
          value={userGoal}
          onChange={(e) => setUserGoal(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 text-white rounded-lg px-2.5 py-1 text-xs outline-none w-full cursor-pointer"
        >
          <option value="Viral Hook dengan Retensi Tinggi (TikTok / Shorts)">Viral Hook Retensi Tinggi (TikTok & Shorts)</option>
          <option value="Clutch, Reaksi Hype & Momen Intens">Clutch, Reaksi Hype & Momen Intens</option>
          <option value="Momen Lucu, Punchlines & Chat Reaction">Momen Lucu, Punchlines & Chat Reaction</option>
          <option value="Storytelling & Insight Penting Podcast">Storytelling & Insight Penting Podcast</option>
        </select>
      </div>

      {/* Analysis Summary message */}
      {analysisSummary && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{analysisSummary}</p>
        </div>
      )}

      {/* Detected Clips List */}
      {detectedClips.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-neutral-950/40 rounded-xl border border-neutral-800/80 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-500 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-neutral-300">Belum ada hook yang dianalisis</p>
          <p className="text-xs text-neutral-500 max-w-sm">
            Klik tombol <span className="text-amber-400 font-bold">"Cari Hook Otomatis"</span> di atas agar AI menemukan potongan momen terbaik dengan skor viral tertinggi!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Ditemukan <strong className="text-white">{detectedClips.length}</strong> Rekomendasi Klip AI</span>
            <button
              onClick={onAutoSelectTopClips}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline underline-offset-2"
            >
              Pilih Semua untuk Digabung
            </button>
          </div>

          <div className="space-y-2.5">
            {detectedClips.map((clip, idx) => {
              const isCurrentPlaying = activeClipId === clip.id;
              const formatSec = (s: number) => `${Math.floor(s / 60)}:${(Math.floor(s % 60)).toString().padStart(2, "0")}`;

              return (
                <div
                  key={clip.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col gap-2.5 ${
                    isCurrentPlaying
                      ? "bg-neutral-800/90 border-amber-400/80 ring-1 ring-amber-400/40"
                      : "bg-neutral-950/70 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {/* Top Bar: Title, Score & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-800 text-[11px] font-bold text-neutral-300 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-tight">{clip.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-black border flex items-center gap-1 ${getScoreColor(clip.viralScore)}`}>
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{clip.viralScore} / 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Hook Category & Hook Sentence */}
                  <div className="bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      {getCategoryBadge(clip.hookCategory)}
                      <span className="text-[10px] text-neutral-400 font-mono">
                        ⏱️ {formatSec(clip.startTime)} - {formatSec(clip.endTime)} ({Math.round(clip.duration)}s)
                      </span>
                    </div>

                    <div className="text-xs text-neutral-200 font-medium">
                      <span className="text-amber-400 font-bold">🎣 3-Sec Hook: </span>
                      <span className="italic">"{clip.hookSentence}"</span>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-snug">
                      💡 {clip.whyItWorks}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      id={`btn-play-clip-${clip.id}`}
                      onClick={() => onSelectClipToPlay(clip)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span>{isCurrentPlaying ? "Sedang Diputar" : "Putar Klip Ini"}</span>
                    </button>

                    <button
                      id={`btn-toggle-timeline-${clip.id}`}
                      onClick={() => onToggleClipInTimeline(clip)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        clip.isSelected
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                      }`}
                    >
                      {clip.isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Masuk Timeline Gabung</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Tambahkan ke Gabungan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
