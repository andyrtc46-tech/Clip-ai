/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SourceInputModal } from "./components/SourceInputModal";
import { SmartVideoPlayer } from "./components/SmartVideoPlayer";
import { AiHookDetectorPanel } from "./components/AiHookDetectorPanel";
import { MultiClipTimeline } from "./components/MultiClipTimeline";
import { WatermarkStudio } from "./components/WatermarkStudio";
import { FramingAndCaptions } from "./components/FramingAndCaptions";
import { ExportModal } from "./components/ExportModal";
import { MobileAppInstallModal } from "./components/MobileAppInstallModal";
import {
  FramingConfig,
  SubtitleConfig,
  TransitionType,
  VideoClipSegment,
  VideoSourceData,
  WatermarkConfig,
} from "./types";
import { Sparkles, Layers, Stamp, Smartphone, Video, Zap, Scissors, ArrowRight } from "lucide-react";

export default function App() {
  // Initial default source (High quality Sci-Fi Action / Streaming Highlight with YouTube integration)
  const [currentSource, setCurrentSource] = useState<VideoSourceData>({
    id: "sample-scifi-action",
    title: "Tears of Steel - Sci-Fi Action & Cyberpunk Highlight",
    creator: "Blender Studio / VFX Highlights",
    platform: "youtube",
    youtubeId: "ScMzIvxBSi4",
    duration: 184,
    url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    transcript: [
      { start: 0, end: 12, text: "Wait guys, look at the robotic drones advancing on the bridge." },
      { start: 13, end: 28, text: "We have only 30 seconds before the main core collapses. Stay in position!" },
      { start: 29, end: 55, text: "First drone down! Locking coordinates right now. Watch the incoming lasers!" },
      { start: 56, end: 92, text: "DIRECT HIT! That's two! Three! The central shield is completely breached!" },
      { start: 93, end: 125, text: "NO WAY! Look at that explosion! We actually neutralized the giant mech!" },
      { start: 126, end: 155, text: "Check your sensor telemetry right now. All hostiles offline!" },
      { start: 156, end: 184, text: "Mission accomplished team. That was the most intense encounter of the year." },
    ],
  });

  // Preloaded initial detected clips for instant delight
  const [detectedClips, setDetectedClips] = useState<VideoClipSegment[]>([
    {
      id: "clip-initial-1",
      title: "🔥 Epic 1v5 Ace Clutch Opening",
      hookCategory: "Shock",
      startTime: 0,
      endTime: 38,
      duration: 38,
      viralScore: 98,
      hookSentence: "Wait guys, my whole team just got wiped out on A site!",
      whyItWorks: "Immediate explosive sound and dramatic high stakes setup that grabs viewer attention in the first 2 seconds.",
      emotion: "Mindblown",
      suggestedSubtitles: [
        { start: 0, end: 3.0, text: "MY WHOLE TEAM GOT WIPED!", highlight: "WIPED OUT", color: "#FFE600" },
        { start: 3.1, end: 6.5, text: "15 HP VS 5 ENEMIES?!", highlight: "15 HP", color: "#00FF66" },
        { start: 6.6, end: 10.0, text: "LISTEN TO THEIR FOOTSTEPS!", highlight: "FOOTSTEPS", color: "#FF3366" },
      ],
      speed: 1.0,
      volume: 1.0,
      transition: "crossfade",
      isSelected: true,
    },
    {
      id: "clip-initial-2",
      title: "⚡ 15 HP Pistol Clutch Setup",
      hookCategory: "Curiosity",
      startTime: 39,
      endTime: 85,
      duration: 46,
      viralScore: 92,
      hookSentence: "I have 15 HP and there's no way I survive this...",
      whyItWorks: "Underdog tension creates an unresolved question loop forcing viewers to stay until the end.",
      emotion: "Suspense",
      suggestedSubtitles: [
        { start: 0, end: 3.0, text: "15 HP VS THE WHOLE TEAM...", highlight: "15 HP", color: "#FFE600" },
        { start: 3.1, end: 6.0, text: "Watch what happens next!", highlight: "WATCH", color: "#38BDF8" },
      ],
      speed: 1.0,
      volume: 1.0,
      transition: "crossfade",
      isSelected: true,
    },
    {
      id: "clip-initial-3",
      title: "🎯 Shaking Hands & Victory Speech",
      hookCategory: "Story",
      startTime: 126,
      endTime: 165,
      duration: 39,
      viralScore: 89,
      hookSentence: "My hands are literally shaking right now!",
      whyItWorks: "High emotional authenticity and victory validation gives viewers a strong dopamine payoff.",
      emotion: "Excitement",
      suggestedSubtitles: [
        { start: 0, end: 2.5, text: "MY HANDS ARE SHAKING!", highlight: "SHAKING", color: "#FFE600" },
        { start: 2.6, end: 5.0, text: "CLEANEST ROUND EVER!", highlight: "CLEANEST", color: "#00FF66" },
      ],
      speed: 1.0,
      volume: 1.0,
      transition: "crossfade",
      isSelected: true,
    },
  ]);

  const [activeClipId, setActiveClipId] = useState<string | null>("clip-initial-1");

  // Watermark State
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: true,
    type: "text",
    text: "@AutoClipAI",
    font: "Montserrat, sans-serif",
    textColor: "#FFFFFF",
    bgColor: "#000000",
    bgOpacity: 0.6,
    imageUrl: null,
    position: "top-right",
    customX: 85,
    customY: 8,
    opacity: 0.9,
    scale: 1.0,
    rotation: 0,
    shadow: true,
  });

  const [watermarkImageElement, setWatermarkImageElement] = useState<HTMLImageElement | null>(null);

  // Framing & Aspect Ratio State
  const [framing, setFraming] = useState<FramingConfig>({
    orientation: "vertical", // default vertical 9:16 for TikTok/Shorts as requested
    backgroundMode: "blur",
    splitScreen: false,
    panSpeed: 1,
  });

  // Subtitle / Captions State
  const [subtitles, setSubtitles] = useState<SubtitleConfig>({
    enabled: true,
    style: "hormozi",
    fontSize: 28,
    positionY: 72,
    highlightColor: "#FFE600",
    textColor: "#FFFFFF",
    uppercase: true,
    animatedPop: true,
  });

  const [globalTransition, setGlobalTransition] = useState<TransitionType>("crossfade");

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState(false);

  // Active Tab in Editor Panel
  const [activeTab, setActiveTab] = useState<"hooks" | "timeline" | "watermark" | "framing">("hooks");

  // Video Element Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeClip = detectedClips.find((c) => c.id === activeClipId) || detectedClips[0] || null;
  const selectedClips = detectedClips.filter((c) => c.isSelected);
  const totalDurationSeconds = selectedClips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

  const handleSelectSource = (newSource: VideoSourceData) => {
    setCurrentSource(newSource);
    const clipDur = Math.min(newSource.duration || 60, 35);
    const defaultClip: VideoClipSegment = {
      id: `clip-init-${Date.now()}`,
      title: `⚡ ${newSource.title.slice(0, 30)} (Opening Hook)`,
      hookCategory: "Shock",
      startTime: 0,
      endTime: clipDur,
      duration: clipDur,
      viralScore: 95,
      hookSentence: newSource.title,
      whyItWorks: "Immediate attention-grabbing intro for high retention.",
      emotion: "Hyped",
      suggestedSubtitles: [
        { start: 0, end: Math.min(3.5, clipDur / 2), text: (newSource.title || "WATCH THIS").toUpperCase().slice(0, 35), highlight: "VIRAL", color: "#FFE600" },
      ],
      speed: 1.0,
      volume: 1.0,
      transition: "crossfade",
      isSelected: true,
    };
    setDetectedClips([defaultClip]);
    setActiveClipId(defaultClip.id);
  };

  const handleClipsDetected = (newClips: VideoClipSegment[], _summary: string) => {
    setDetectedClips(newClips);
    if (newClips.length > 0) {
      setActiveClipId(newClips[0].id);
    }
  };

  const handleSelectClipToPlay = (clip: VideoClipSegment) => {
    setActiveClipId(clip.id);
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startTime;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleToggleClipInTimeline = (clip: VideoClipSegment) => {
    setDetectedClips((prev) =>
      prev.map((c) => (c.id === clip.id ? { ...c, isSelected: !c.isSelected } : c))
    );
  };

  const handleAutoSelectTopClips = () => {
    setDetectedClips((prev) => prev.map((c) => ({ ...c, isSelected: true })));
  };

  const handleUpdateClip = (id: string, updates: Partial<VideoClipSegment>) => {
    setDetectedClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleRemoveClipFromTimeline = (id: string) => {
    setDetectedClips((prev) => prev.map((c) => (c.id === id ? { ...c, isSelected: false } : c)));
  };

  const handleMoveClip = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= detectedClips.length) return;
    const newClips = [...detectedClips];
    const temp = newClips[index];
    newClips[index] = newClips[targetIdx];
    newClips[targetIdx] = temp;
    setDetectedClips(newClips);
  };

  const handleUploadWatermarkImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setWatermark((prev) => ({ ...prev, imageUrl: dataUrl, type: "image" }));
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        setWatermarkImageElement(img);
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentSource={currentSource}
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenMobileAppModal={() => setIsMobileAppModalOpen(true)}
        selectedClipsCount={selectedClips.length}
        totalDurationSeconds={totalDurationSeconds}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left / Center Column: Smart Video Player Stage */}
        <div className="lg:col-span-7 space-y-4 w-full">
          <SmartVideoPlayer
            source={currentSource}
            activeClip={activeClip}
            watermark={watermark}
            framing={framing}
            subtitles={subtitles}
            watermarkImageElement={watermarkImageElement}
            videoRef={videoRef}
          />

          {/* Quick Bar: Video metadata & Action badges */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {currentSource.platform}
                </span>
                <span className="text-xs text-neutral-400 font-medium">Tanpa Batasan Durasi</span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{currentSource.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-switch-orientation-quick"
                onClick={() =>
                  setFraming((prev) => ({
                    ...prev,
                    orientation: prev.orientation === "vertical" ? "horizontal" : "vertical",
                  }))
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition cursor-pointer border border-neutral-700"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>{framing.orientation === "vertical" ? "9:16 Vertikal" : "16:9 Horizontal"}</span>
              </button>

              <button
                id="btn-open-export-quick"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-neutral-950 text-xs font-extrabold transition cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Export 4K</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Hook, Timeline Stitching, Watermark, & Framing Controls */}
        <div className="lg:col-span-5 space-y-4 w-full">
          {/* Navigation Pill Tabs */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800 shadow-md">
            <button
              id="tab-btn-hooks"
              onClick={() => setActiveTab("hooks")}
              className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "hooks"
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="truncate max-w-full">AI Hook</span>
            </button>

            <button
              id="tab-btn-timeline"
              onClick={() => setActiveTab("timeline")}
              className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="truncate max-w-full">Gabung</span>
            </button>

            <button
              id="tab-btn-watermark"
              onClick={() => setActiveTab("watermark")}
              className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "watermark"
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span className="truncate max-w-full">Watermark</span>
            </button>

            <button
              id="tab-btn-framing"
              onClick={() => setActiveTab("framing")}
              className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "framing"
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="truncate max-w-full">Layar/Sub</span>
            </button>
          </div>

          {/* Active Tab Panel Body */}
          {activeTab === "hooks" && (
            <AiHookDetectorPanel
              source={currentSource}
              detectedClips={detectedClips}
              onClipsDetected={handleClipsDetected}
              activeClipId={activeClipId}
              onSelectClipToPlay={handleSelectClipToPlay}
              onToggleClipInTimeline={handleToggleClipInTimeline}
              onAutoSelectTopClips={handleAutoSelectTopClips}
            />
          )}

          {activeTab === "timeline" && (
            <MultiClipTimeline
              clips={detectedClips}
              onUpdateClip={handleUpdateClip}
              onRemoveClip={handleRemoveClipFromTimeline}
              onMoveClip={handleMoveClip}
              onSelectClipToPlay={handleSelectClipToPlay}
              activeClipId={activeClipId}
              globalTransition={globalTransition}
              onChangeGlobalTransition={setGlobalTransition}
            />
          )}

          {activeTab === "watermark" && (
            <WatermarkStudio
              watermark={watermark}
              onChangeWatermark={(updates) => setWatermark((prev) => ({ ...prev, ...updates }))}
              onUploadWatermarkImage={handleUploadWatermarkImage}
            />
          )}

          {activeTab === "framing" && (
            <FramingAndCaptions
              framing={framing}
              onChangeFraming={(updates) => setFraming((prev) => ({ ...prev, ...updates }))}
              subtitles={subtitles}
              onChangeSubtitles={(updates) => setSubtitles((prev) => ({ ...prev, ...updates }))}
            />
          )}
        </div>
      </main>

      {/* Source Input Modal (YouTube, Twitch, Kick, Upload, Samples) */}
      <SourceInputModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelectSource={handleSelectSource}
      />

      {/* Export Modal (480p up to 4K 60fps, Multi-clip merging) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        videoElement={videoRef.current}
        source={currentSource}
        clips={detectedClips}
        activeClip={activeClip}
        watermark={watermark}
        framing={framing}
        subtitles={subtitles}
        watermarkImageElement={watermarkImageElement}
      />

      {/* Mobile App Install Modal (Android & iOS PWA / APK guide) */}
      <MobileAppInstallModal
        isOpen={isMobileAppModalOpen}
        onClose={() => setIsMobileAppModalOpen(false)}
      />
    </div>
  );
}
