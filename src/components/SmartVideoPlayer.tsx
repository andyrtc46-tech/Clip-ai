import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Youtube, Video, Repeat } from "lucide-react";
import { FramingConfig, SubtitleConfig, VideoClipSegment, VideoSourceData, WatermarkConfig } from "../types";

interface SmartVideoPlayerProps {
  source: VideoSourceData;
  activeClip: VideoClipSegment | null;
  watermark: WatermarkConfig;
  framing: FramingConfig;
  subtitles: SubtitleConfig;
  watermarkImageElement: HTMLImageElement | null;
  onTimeUpdate?: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  source,
  activeClip,
  watermark,
  framing,
  subtitles,
  watermarkImageElement,
  onTimeUpdate,
  videoRef,
}) => {
  const blurVideoRef = useRef<HTMLVideoElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.duration || 180);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerMode, setPlayerMode] = useState<"auto" | "canvas" | "youtube">("auto");
  const [loopClipOnly, setLoopClipOnly] = useState(false);

  const isYouTubeSource = Boolean(source.youtubeId && (source.platform === "youtube" || source.url.includes("youtu")));
  const effectiveIsYouTube = isYouTubeSource && (playerMode === "auto" || playerMode === "youtube");

  const getPlayableVideoUrl = (srcData: VideoSourceData): string => {
    const defaultFallback = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";
    if (!srcData) return defaultFallback;

    const url = srcData.videoUrl || srcData.url || "";
    if (!url) return defaultFallback;

    // Blob URLs or uploaded local files are 100% playable in HTML5 video
    if (srcData.isLocalFile || url.startsWith("blob:") || url.startsWith("data:")) {
      return url;
    }

    // Direct playable media extensions or CDNs
    const isDirectMedia =
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".mov") ||
      url.endsWith(".m4v") ||
      url.endsWith(".ogv") ||
      url.includes(".mp4?") ||
      url.includes(".webm?") ||
      url.includes("storage.googleapis.com") ||
      url.includes("cloudinary.com") ||
      url.includes("s3.amazonaws.com");

    const isYouTubePage = url.includes("youtube.com") || url.includes("youtu.be");
    const isTwitchPage = url.includes("twitch.tv");
    const isKickPage = url.includes("kick.com");

    if (isDirectMedia && !isYouTubePage && !isTwitchPage && !isKickPage) {
      return url;
    }

    // For YouTube / Twitch / Kick webpage URLs in Canvas Mode, use reliable direct sample stream
    if (srcData.id === "sample-podcast-ai") {
      return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
    }
    if (srcData.id === "sample-irl-kick" || srcData.youtubeId === "dQw4w9WgXcQ") {
      return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    }
    return defaultFallback;
  };

  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(() => getPlayableVideoUrl(source));

  // Sync duration and active video source on source or playerMode load
  useEffect(() => {
    const nextUrl = getPlayableVideoUrl(source);
    setActiveVideoSrc(nextUrl);

    if (source.duration) {
      setDuration(source.duration);
    }
    setIsPlaying(false);

    if (videoRef.current) {
      if (videoRef.current.src !== nextUrl || videoRef.current.error) {
        videoRef.current.src = nextUrl;
        videoRef.current.load();
      }
    }
    if (blurVideoRef.current) {
      if (blurVideoRef.current.src !== nextUrl || blurVideoRef.current.error) {
        blurVideoRef.current.src = nextUrl;
        blurVideoRef.current.load();
      }
    }
  }, [source, playerMode]);

  // When active clip changes, seek to clip start time
  useEffect(() => {
    if (activeClip && activeClip.startTime !== undefined) {
      if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [activeClip.startTime, true] }),
          "*"
        );
      }
      if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
        try {
          videoRef.current.currentTime = activeClip.startTime;
        } catch (e) {}
      }
      setCurrentTime(activeClip.startTime);
      if (blurVideoRef.current && Number.isFinite(blurVideoRef.current.duration)) {
        try {
          blurVideoRef.current.currentTime = activeClip.startTime;
        } catch (e) {}
      }
    }
  }, [activeClip?.id, effectiveIsYouTube]);

  // YouTube postMessage timer and listener
  useEffect(() => {
    if (!effectiveIsYouTube) return;

    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.25;
          if (loopClipOnly && activeClip && next >= activeClip.endTime) {
            ytIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [activeClip.startTime, true] }),
              "*"
            );
            return activeClip.startTime;
          }
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          onTimeUpdate?.(next);
          return next;
        });
      }, 250);
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.origin.includes("youtube.com")) return;
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            setCurrentTime(data.info.currentTime);
            onTimeUpdate?.(data.info.currentTime);
          }
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === "number") {
            setIsPlaying(data.info.playerState === 1);
          }
        }
      } catch (e) {}
    };

    window.addEventListener("message", handleMessage);
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("message", handleMessage);
    };
  }, [effectiveIsYouTube, isPlaying, loopClipOnly, activeClip, duration]);

  const handleTogglePlayerMode = () => {
    const nextMode = (effectiveIsYouTube ? "canvas" : "youtube");
    setPlayerMode(nextMode);

    if (nextMode === "canvas") {
      // Pause YouTube iframe safely
      if (ytIframeRef.current?.contentWindow) {
        try {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
        } catch (e) {}
      }
      setIsPlaying(false);
      const targetTime = activeClip && loopClipOnly ? activeClip.startTime : currentTime;
      if (videoRef.current) {
        try {
          if (videoRef.current.src !== activeVideoSrc || videoRef.current.error) {
            videoRef.current.src = activeVideoSrc;
            videoRef.current.load();
          }
          videoRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        } catch (e) {}
      }
      if (blurVideoRef.current) {
        try {
          if (blurVideoRef.current.src !== activeVideoSrc || blurVideoRef.current.error) {
            blurVideoRef.current.src = activeVideoSrc;
            blurVideoRef.current.load();
          }
          blurVideoRef.current.currentTime = targetTime;
        } catch (e) {}
      }
    } else {
      // Pause HTML5 Video
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (blurVideoRef.current) {
        blurVideoRef.current.pause();
      }
      setIsPlaying(false);
      if (ytIframeRef.current?.contentWindow) {
        try {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [currentTime, true] }),
            "*"
          );
        } catch (e) {}
      }
    }
  };

  const togglePlay = async () => {
    if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
      const nextPlay = !isPlaying;
      const func = nextPlay ? "playVideo" : "pauseVideo";
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args: [] }),
          "*"
        );
      } catch (e) {}
      setIsPlaying(nextPlay);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Ensure YouTube iframe is paused if still active in background
    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      } catch (e) {}
    }

    if (video.paused) {
      if (!video.src || video.src === "" || video.error || video.src.includes("youtube.com") || video.src.includes("youtu.be")) {
        video.src = activeVideoSrc;
        video.load();
        if (video.readyState === 0) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 350);
            const done = () => {
              clearTimeout(timer);
              video.removeEventListener("loadedmetadata", done);
              video.removeEventListener("canplay", done);
              video.removeEventListener("error", done);
              resolve();
            };
            video.addEventListener("loadedmetadata", done, { once: true });
            video.addEventListener("canplay", done, { once: true });
            video.addEventListener("error", done, { once: true });
          });
        }
      }

      // If at end of video, restart from beginning
      if (video.ended || (duration > 0 && video.currentTime >= duration - 0.5)) {
        try {
          const startTime = loopClipOnly && activeClip ? activeClip.startTime : 0;
          video.currentTime = startTime;
          setCurrentTime(startTime);
        } catch (e) {}
      }

      try {
        await video.play();
        setIsPlaying(true);
        if (blurVideoRef.current && blurVideoRef.current.src) {
          blurVideoRef.current.currentTime = video.currentTime;
          blurVideoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn("Unmuted video play restricted or loading, retrying muted play:", err?.message || err);
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
          if (blurVideoRef.current && blurVideoRef.current.src) {
            blurVideoRef.current.currentTime = video.currentTime;
            blurVideoRef.current.play().catch(() => {});
          }
        } catch (retryErr: any) {
          console.warn("Retrying video playback with guaranteed fallback sample...");
          try {
            const fallbackSample = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
            setActiveVideoSrc(fallbackSample);
            video.src = fallbackSample;
            video.load();
            await new Promise((r) => setTimeout(r, 200));
            await video.play();
            setIsPlaying(true);
          } catch (finalErr) {
            console.warn("Playback paused gracefully:", finalErr);
            setIsPlaying(false);
          }
        }
      }
    } else {
      video.pause();
      if (blurVideoRef.current) blurVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || effectiveIsYouTube) return;
    // Do not interfere with export engine while it renders multi-clips
    if (videoRef.current.dataset.isExporting === "true") return;

    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (onTimeUpdate) onTimeUpdate(curr);

    // Sync blur video element if drifting
    if (blurVideoRef.current && Math.abs(blurVideoRef.current.currentTime - curr) > 0.3) {
      blurVideoRef.current.currentTime = curr;
    }

    // Only loop when loopClipOnly is activated
    if (isPlaying && loopClipOnly && activeClip && activeClip.endTime > activeClip.startTime && curr >= activeClip.endTime) {
      videoRef.current.currentTime = activeClip.startTime;
      if (blurVideoRef.current) {
        blurVideoRef.current.currentTime = activeClip.startTime;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
        "*"
      );
      setCurrentTime(target);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
    if (blurVideoRef.current) {
      blurVideoRef.current.currentTime = target;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [val * 100] }),
        "*"
      );
      setIsMuted(val === 0);
      return;
    }
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: nextMute ? "mute" : "unMute", args: [] }),
        "*"
      );
      return;
    }
    if (!videoRef.current) return;
    videoRef.current.muted = nextMute;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Determine current active subtitle in clip
  const currentClipRelativeTime = activeClip ? Math.max(0, currentTime - activeClip.startTime) : currentTime;
  const currentSubtitle = activeClip?.suggestedSubtitles?.find(
    (sub) => currentClipRelativeTime >= sub.start && currentClipRelativeTime <= sub.end
  );

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
      {/* Video Viewport Area */}
      <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[380px] max-h-[560px] select-none">
        {/* Main Video Container with Aspect Ratio switch */}
        <div
          className={`relative transition-all duration-300 flex items-center justify-center overflow-hidden mx-auto ${
            framing.orientation === "vertical"
              ? "aspect-[9/16] w-full max-w-[320px] sm:max-w-[360px] md:max-w-[380px] h-auto max-h-[55vh] sm:max-h-[520px] rounded-xl shadow-2xl border border-neutral-700/60"
              : framing.orientation === "square"
              ? "aspect-square w-full max-w-[360px] sm:max-w-[420px] h-auto max-h-[50vh] rounded-xl border border-neutral-700/60"
              : "aspect-video w-full max-w-4xl rounded-xl border border-neutral-700/60"
          }`}
        >
          {/* Vertical 9:16 Blurred Background (if vertical & blur mode) */}
          {framing.orientation === "vertical" && framing.backgroundMode === "blur" && (
            effectiveIsYouTube && source.thumbnail ? (
              <img
                src={source.thumbnail}
                alt="Background Blur"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-40 pointer-events-none"
              />
            ) : (
              <video
                ref={blurVideoRef}
                src={activeVideoSrc}
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-40 pointer-events-none"
                muted
                playsInline
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
                  if (!target.src.includes("ElephantsDream.mp4")) {
                    target.src = fallback;
                    target.load();
                  }
                }}
              />
            )
          )}

          {/* If YouTube video, render responsive YouTube Embed */}
          {effectiveIsYouTube && (
            <div className="relative z-10 w-full h-full flex items-center justify-center bg-black overflow-hidden">
              <iframe
                ref={ytIframeRef}
                id="yt-embed-player"
                src={`https://www.youtube.com/embed/${source.youtubeId || "ScMzIvxBSi4"}?enablejsapi=1&autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                title={source.title || "YouTube Video Preview"}
                className={`w-full h-full border-0 transition-transform duration-300 ${
                  framing.orientation === "vertical" ? "scale-[1.35] sm:scale-[1.25]" : "scale-100"
                }`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Primary HTML5 Video Element */}
          <video
            key={`${source.id || "source"}-${playerMode}`}
            ref={videoRef}
            src={activeVideoSrc}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration || source.duration || 180;
              setDuration(dur);
              if (activeClip && activeClip.startTime > 0) {
                try {
                  e.currentTarget.currentTime = activeClip.startTime;
                  setCurrentTime(activeClip.startTime);
                } catch (err) {}
              }
            }}
            onCanPlay={(e) => {
              if (activeClip && e.currentTarget.currentTime < activeClip.startTime) {
                try {
                  e.currentTarget.currentTime = activeClip.startTime;
                  setCurrentTime(activeClip.startTime);
                } catch (err) {}
              }
            }}
            onError={(e) => {
              console.warn("Video element load notice, applying fallback sample.");
              const target = e.currentTarget;
              const fallback = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
              if (activeVideoSrc !== fallback) {
                setActiveVideoSrc(fallback);
              }
              if (!target.src.includes("ElephantsDream.mp4")) {
                target.src = fallback;
                target.load();
              }
            }}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPlaying={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
            className={`${
              effectiveIsYouTube
                ? "absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
                : `relative z-10 w-full h-full cursor-pointer ${
                    framing.orientation === "vertical" && framing.backgroundMode !== "blur"
                      ? "object-cover"
                      : "object-contain"
                  }`
            }`}
            onClick={togglePlay}
          />

          {/* Big Center Play Overlay Button if Paused */}
          {!isPlaying && !effectiveIsYouTube && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute z-30 w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center shadow-2xl transition transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
              aria-label="Play video"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          )}

          {/* Real-time Subtitle Overlay Preview */}
          {subtitles.enabled && currentSubtitle && (
            <div
              className="absolute z-20 pointer-events-none w-full px-4 flex justify-center text-center transition-all duration-150"
              style={{ top: `${subtitles.positionY}%` }}
            >
              <div
                className={`px-3 py-1 rounded-md font-black tracking-tight drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] ${
                  subtitles.style === "hormozi" || subtitles.style === "mrbeast"
                    ? "bg-black/75 border border-yellow-400/30"
                    : ""
                }`}
                style={{
                  fontSize: `${subtitles.fontSize * 0.7}px`,
                  color: subtitles.textColor || "#FFFFFF",
                }}
              >
                {subtitles.uppercase ? currentSubtitle.text.toUpperCase() : currentSubtitle.text}
              </div>
            </div>
          )}

          {/* Real-time Watermark Overlay Preview */}
          {watermark.enabled && (
            <div
              className="absolute z-20 pointer-events-none transition-all duration-200"
              style={{
                opacity: watermark.opacity,
                transform: `rotate(${watermark.rotation}deg) scale(${watermark.scale})`,
                ...(watermark.position === "top-left"
                  ? { top: "6%", left: "6%" }
                  : watermark.position === "top-right"
                  ? { top: "6%", right: "6%" }
                  : watermark.position === "bottom-left"
                  ? { bottom: "14%", left: "6%" }
                  : watermark.position === "bottom-right"
                  ? { bottom: "14%", right: "6%" }
                  : watermark.position === "center"
                  ? { top: "50%", left: "50%", transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg) scale(${watermark.scale})` }
                  : { top: `${watermark.customY}%`, left: `${watermark.customX}%` }),
              }}
            >
              {watermark.type === "image" && (watermark.imageUrl || watermarkImageElement) ? (
                <img
                  src={watermark.imageUrl || ""}
                  alt="Watermark"
                  className="max-h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                />
              ) : (
                <div
                  className={`px-2.5 py-1 rounded-lg font-bold text-sm select-none ${
                    watermark.shadow ? "drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" : ""
                  }`}
                  style={{
                    backgroundColor:
                      watermark.bgOpacity > 0
                        ? `${watermark.bgColor}${Math.round(watermark.bgOpacity * 255).toString(16).padStart(2, "0")}`
                        : "transparent",
                    color: watermark.textColor,
                    fontFamily: watermark.font,
                  }}
                >
                  {watermark.text || "@AutoClipAI"}
                </div>
              )}
            </div>
          )}

          {/* Aspect Ratio Badge floating indicator */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-800 text-[11px] font-semibold text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {framing.orientation === "vertical" ? "9:16 Vertikal (Shorts/TikTok/Reels)" : "16:9 Horizontal (YouTube/Twitch)"}
          </div>

          {/* YouTube & Player Engine Toggle Badge */}
          {isYouTubeSource && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
              <button
                onClick={handleTogglePlayerMode}
                className="bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[10px] font-bold text-white shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Klik untuk beralih antara Mode YouTube Embed dan Mode Video Biasa (Canvas)"
              >
                {effectiveIsYouTube ? (
                  <>
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>Mode: YouTube Embed</span>
                    <span className="text-amber-400 font-normal underline ml-1">Ubah ke Mode Biasa</span>
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode: Video Biasa (Canvas)</span>
                    <span className="text-neutral-400 font-normal underline ml-1">Ubah ke YouTube</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrubber & Active Clip Marker Track */}
      <div className="px-5 pt-3 pb-1">
        <div className="relative flex items-center group">
          {/* Segment range indicator if active clip selected */}
          {activeClip && duration > 0 && (
            <div
              className="absolute h-2 bg-amber-500/40 border-l-2 border-r-2 border-amber-400 rounded pointer-events-none z-10"
              style={{
                left: `${(activeClip.startTime / duration) * 100}%`,
                width: `${((activeClip.endTime - activeClip.startTime) / duration) * 100}%`,
              }}
            />
          )}

          <input
            id="video-scrubber"
            type="range"
            min={0}
            max={duration || 180}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Player Action Toolbar */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-neutral-200 border-t border-neutral-800/80">
        <div className="flex items-center gap-3">
          <button
            id="btn-play-toggle"
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center transition cursor-pointer font-bold shadow-md shadow-amber-500/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (effectiveIsYouTube && ytIframeRef.current?.contentWindow) {
                const start = activeClip ? activeClip.startTime : 0;
                ytIframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: "command", func: "seekTo", args: [start, true] }),
                  "*"
                );
                setCurrentTime(start);
                return;
              }
              if (videoRef.current) {
                videoRef.current.currentTime = activeClip ? activeClip.startTime : 0;
                setCurrentTime(activeClip ? activeClip.startTime : 0);
              }
            }}
            title="Kembali ke Awal Klip"
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Loop Clip Only Toggle */}
          <button
            onClick={() => setLoopClipOnly(!loopClipOnly)}
            title={loopClipOnly ? "Looping klip aktif: Hidup (Klik untuk putar terus seluruh video)" : "Looping klip: Mati (Putar terus seluruh video)"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
              loopClipOnly
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Time text */}
          <div className="text-xs font-mono text-neutral-400">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Mode Controls */}
        <div className="flex items-center gap-3">
          {isYouTubeSource && (
            <button
              onClick={handleTogglePlayerMode}
              title="Ganti Engine Pemutar (YouTube Iframe vs Video Canvas)"
              className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {playerMode === "canvas" ? (
                <>
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">Mode: Video Biasa (Canvas)</span>
                </>
              ) : (
                <>
                  <Youtube className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-medium">Mode: YouTube Iframe</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-neutral-400 hover:text-white transition cursor-pointer p-1"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <select
            value={playbackRate}
            onChange={(e) => {
              const rate = Number(e.target.value);
              setPlaybackRate(rate);
              if (videoRef.current) videoRef.current.playbackRate = rate;
            }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 outline-none cursor-pointer"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
