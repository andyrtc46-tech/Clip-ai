import { ExportConfig, FramingConfig, SubtitleConfig, VideoClipSegment, WatermarkConfig } from "../types";

export interface RenderOptions {
  videoElement: HTMLVideoElement;
  clips: VideoClipSegment[];
  watermark: WatermarkConfig;
  framing: FramingConfig;
  subtitles: SubtitleConfig;
  exportConfig: ExportConfig;
  onProgress: (progress: { percent: number; stage: string; currentClip: number; totalClips: number }) => void;
  watermarkImageElement?: HTMLImageElement | null;
  thumbnailImageElement?: HTMLImageElement | null;
}

export function getResolutionDimensions(
  resolution: ExportConfig["resolution"],
  orientation: FramingConfig["orientation"]
): { width: number; height: number } {
  let baseWidth = 1920;
  let baseHeight = 1080;

  switch (resolution) {
    case "480p":
      baseWidth = 854;
      baseHeight = 480;
      break;
    case "720p":
      baseWidth = 1280;
      baseHeight = 720;
      break;
    case "1080p":
      baseWidth = 1920;
      baseHeight = 1080;
      break;
    case "1440p":
      baseWidth = 2560;
      baseHeight = 1440;
      break;
    case "4k":
      baseWidth = 3840;
      baseHeight = 2160;
      break;
  }

  if (orientation === "vertical") {
    // 9:16 portrait
    return { width: baseHeight, height: baseWidth };
  } else if (orientation === "square") {
    // 1:1 square
    const side = Math.min(baseWidth, baseHeight);
    return { width: side, height: side };
  } else if (orientation === "portrait") {
    // 4:5 Instagram feed
    const w = baseHeight;
    const h = Math.round(baseHeight * 1.25);
    return { width: w, height: h };
  }

  // 16:9 landscape default
  return { width: baseWidth, height: baseHeight };
}

// Main In-Browser Video Rendering & Multi-Clip Stitching Engine
export async function renderAndExportVideo(options: RenderOptions): Promise<Blob> {
  const { videoElement, clips, watermark, framing, subtitles, exportConfig, onProgress, watermarkImageElement, thumbnailImageElement } = options;

  if (!clips || clips.length === 0) {
    throw new Error("Tidak ada potongan klip video yang dipilih untuk dirender.");
  }

  // Mark video element as actively exporting to prevent UI event listener interference
  try {
    videoElement.dataset.isExporting = "true";
  } catch (e) {}

  // Safe dimension calculation (even dimensions strictly required by WebM/H264 encoders)
  const rawDims = getResolutionDimensions(exportConfig.resolution, framing.orientation);
  const maxDimension = 1920;
  let targetWidth = rawDims.width;
  let targetHeight = rawDims.height;
  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }
  // Ensure even dimensions (divisible by 2) for codec compliance
  targetWidth = Math.floor(targetWidth / 2) * 2;
  targetHeight = Math.floor(targetHeight / 2) * 2;

  const targetFps = exportConfig.fps === 60 ? 60 : exportConfig.fps === 24 ? 24 : 30;
  const frameIntervalMs = Math.round(1000 / targetFps);

  // Create high-res offscreen rendering canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal membuat 2D canvas context untuk video rendering.");
  }

  // Pre-fill canvas with dark backdrop
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Set up Audio Context and Destination safely
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;

  // Create canvas capture stream
  const captureMethod = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
  if (!captureMethod) {
    throw new Error("Browser ini tidak mendukung canvas capture stream.");
  }

  // Capture canvas at target FPS safely
  const canvasStream: MediaStream = captureMethod.call(canvas, targetFps);

  // Safe audio track attachment: try native video stream track first
  let directAudioAttached = false;
  try {
    const vCapture = (videoElement as any).captureStream || (videoElement as any).mozCaptureStream;
    if (typeof vCapture === "function") {
      const vStream = vCapture.call(videoElement) as MediaStream;
      const vTracks = vStream ? vStream.getAudioTracks() : [];
      if (vTracks && vTracks.length > 0) {
        canvasStream.addTrack(vTracks[0].clone());
        directAudioAttached = true;
      }
    }
  } catch (e) {}

  if (!directAudioAttached) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => {});
        }
        audioDestination = audioContext.createMediaStreamDestination();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(audioDestination);
        osc.start();

        const destTracks = audioDestination.stream.getAudioTracks();
        if (destTracks.length > 0) {
          canvasStream.addTrack(destTracks[0]);
        }
      }
    } catch (audioErr) {
      console.warn("Audio sync notice:", audioErr);
    }
  }

  // Candidate codecs ordered by stability and performance
  const candidateMimeTypes = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm;codecs=h264,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
  ];

  let selectedMimeType = "";
  if (typeof MediaRecorder !== "undefined") {
    for (const candidate of candidateMimeTypes) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        selectedMimeType = candidate;
        break;
      }
    }
  }

  // Balanced bitrate to prevent memory / GPU hardware encoder crashes on 1080p 60fps
  const videoBitsPerSecond =
    exportConfig.resolution === "4k"
      ? 4_500_000
      : exportConfig.resolution === "1440p"
      ? 3_500_000
      : exportConfig.resolution === "1080p"
      ? 2_800_000
      : 1_800_000;

  const recordedChunks: Blob[] = [];
  let mediaRecorder: MediaRecorder;

  try {
    mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: selectedMimeType || undefined,
      videoBitsPerSecond,
    });
  } catch (recErr) {
    mediaRecorder = new MediaRecorder(canvasStream);
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // Start recorder with 200ms chunks to flush buffers and minimize memory usage
  try {
    mediaRecorder.start(200);
  } catch (startErr) {
    mediaRecorder = new MediaRecorder(canvasStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.start(200);
  }

  // Total duration calculation for all clips
  const totalClipsDuration = clips.reduce((acc, c) => acc + Math.max(1, c.endTime - c.startTime), 0);
  let processedDurationSoFar = 0;

  // Process each clip safely
  for (let clipIdx = 0; clipIdx < clips.length; clipIdx++) {
    const clip = clips[clipIdx];
    const clipDuration = Math.max(1, clip.endTime - clip.startTime);

    // Calculate total frame count accurately based on target FPS
    // Cap at 450 frames per clip (~15 seconds at 30fps / 7.5s at 60fps) to prevent buffer exhaustion
    const maxFramesForClip = Math.min(450, Math.round(clipDuration * (targetFps === 60 ? 30 : 24)));
    const totalFrames = Math.max(15, maxFramesForClip);

    onProgress({
      percent: Math.round((processedDurationSoFar / totalClipsDuration) * 90),
      stage: `Memproses Klip ${clipIdx + 1} dari ${clips.length}: "${clip.title}" (${targetWidth}x${targetHeight} ${targetFps}fps)`,
      currentClip: clipIdx + 1,
      totalClips: clips.length,
    });

    // Cue video to start of clip
    try {
      videoElement.muted = true;
      videoElement.currentTime = clip.startTime;
      await waitForSeek(videoElement, 150);
      await videoElement.play().catch(() => {});
    } catch (err) {}

    // Deterministic frame rendering loop
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const progressInClip = frameIdx / totalFrames;
      const currentRelativeClipTime = progressInClip * clipDuration;

      try {
        // Draw video frame to canvas
        drawVideoFrame(ctx, videoElement, targetWidth, targetHeight, framing, progressInClip, clip, thumbnailImageElement);

        // Handle transitions between multi-clips
        const transitionDuration = 0.3;
        if (clipIdx > 0 && currentRelativeClipTime < transitionDuration) {
          const transProgress = currentRelativeClipTime / transitionDuration;
          applyTransitionIn(ctx, targetWidth, targetHeight, clip.transition, transProgress);
        } else if (clipIdx < clips.length - 1 && clipDuration - currentRelativeClipTime < transitionDuration) {
          const transProgress = (clipDuration - currentRelativeClipTime) / transitionDuration;
          applyTransitionOut(ctx, targetWidth, targetHeight, clip.transition, 1 - transProgress);
        }

        // Draw Animated Subtitles if enabled
        if (subtitles.enabled && clip.suggestedSubtitles && clip.suggestedSubtitles.length > 0) {
          drawSubtitles(ctx, clip.suggestedSubtitles, currentRelativeClipTime, targetWidth, targetHeight, subtitles);
        }

        // Draw Watermark (Text or Image)
        if (watermark.enabled) {
          drawWatermark(ctx, watermark, targetWidth, targetHeight, watermarkImageElement);
        }
      } catch (renderFrameErr) {
        // Soft catch frame render glitches to prevent stopping export
        console.warn("Frame render notice:", renderFrameErr);
      }

      // Update progress periodically
      if (frameIdx % 8 === 0 || frameIdx === totalFrames - 1) {
        const currentTotalProgress = (processedDurationSoFar + currentRelativeClipTime) / totalClipsDuration;
        onProgress({
          percent: Math.min(95, Math.max(3, Math.round(currentTotalProgress * 92))),
          stage: `Rendering frame ${frameIdx + 1}/${totalFrames} (Klip ${clipIdx + 1}/${clips.length})...`,
          currentClip: clipIdx + 1,
          totalClips: clips.length,
        });
      }

      // Yield event loop smoothly to keep browser thread completely free
      await new Promise((resolve) => setTimeout(resolve, Math.max(10, Math.min(24, frameIntervalMs))));
    }

    try {
      videoElement.pause();
    } catch (e) {}

    processedDurationSoFar += clipDuration;
  }

  onProgress({
    percent: 98,
    stage: "Menyusun container video dan merilis file resolusi tinggi...",
    currentClip: clips.length,
    totalClips: clips.length,
  });

  // Stop recording and collect blob safely
  return new Promise<Blob>((resolve, reject) => {
    const cleanup = () => {
      try {
        videoElement.dataset.isExporting = "false";
      } catch (e) {}
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };

    mediaRecorder.onerror = (e) => {
      cleanup();
      reject(new Error("MediaRecorder mengalami masalah: " + ((e as any)?.error?.message || "Encoder Error")));
    };

    mediaRecorder.onstop = () => {
      try {
        cleanup();
        const effectiveType = (typeof MediaRecorder !== "undefined" && selectedMimeType && MediaRecorder.isTypeSupported(selectedMimeType))
          ? selectedMimeType
          : "video/webm";
        const finalBlob = new Blob(recordedChunks, { type: effectiveType });
        resolve(finalBlob);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.requestData();
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        }, 120);
      } else {
        const effectiveType = (typeof MediaRecorder !== "undefined" && selectedMimeType && MediaRecorder.isTypeSupported(selectedMimeType))
          ? selectedMimeType
          : "video/webm";
        resolve(new Blob(recordedChunks, { type: effectiveType }));
      }
    } catch (err) {
      reject(err);
    }
  });
}

function waitForSeek(video: HTMLVideoElement, timeoutMs = 200): Promise<void> {
  return new Promise((resolve) => {
    if (video.seeking) {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }, timeoutMs);
    } else {
      resolve();
    }
  });
}

function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  framing: FramingConfig,
  progress: number,
  clip?: VideoClipSegment,
  thumbnailImage?: HTMLImageElement | null
) {
  const hasVideoPixels = Boolean(video && (video.videoWidth > 0 || video.readyState >= 1));
  const vWidth = (video && video.videoWidth > 0) ? video.videoWidth : 1920;
  const vHeight = (video && video.videoHeight > 0) ? video.videoHeight : 1080;

  // Clear background
  ctx.fillStyle = "#0A0A0B";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  let videoDrawSucceeded = false;

  if (hasVideoPixels && video) {
    try {
      if (framing.orientation === "vertical") {
        // 9:16 Vertical Mode (Shorts, Reels, TikTok)
        if (framing.backgroundMode === "blur") {
          // Step 1: Draw zoomed video in background with dark cinematic tint
          const bgScale = Math.max(targetWidth / vWidth, targetHeight / vHeight);
          const bgW = vWidth * bgScale;
          const bgH = vHeight * bgScale;
          const bgX = (targetWidth - bgW) / 2;
          const bgY = (targetHeight - bgH) / 2;
          ctx.drawImage(video, bgX, bgY, bgW, bgH);

          // Dark cinematic scrim backdrop
          ctx.fillStyle = "rgba(10, 10, 12, 0.72)";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Step 2: Draw crisp centered main video
          const mainScale = targetWidth / vWidth;
          const mainW = targetWidth;
          const mainH = vHeight * mainScale;
          const mainY = (targetHeight - mainH) / 2;

          ctx.drawImage(video, 0, mainY, mainW, mainH);
        } else if (framing.splitScreen) {
          // Split screen mode (Top: Facecam/Speaker, Bottom: Gameplay/Action)
          const halfH = targetHeight / 2;
          
          // Top half (Speaker / Center Crop)
          ctx.drawImage(video, vWidth * 0.25, 0, vWidth * 0.5, vHeight, 0, 0, targetWidth, halfH);

          // Divider line
          ctx.fillStyle = "#FFDD00";
          ctx.fillRect(0, halfH - 2, targetWidth, 4);

          // Bottom half (Full Action View)
          ctx.drawImage(video, 0, 0, vWidth, vHeight, 0, halfH, targetWidth, halfH);
        } else {
          // Center crop fill
          const scale = Math.max(targetWidth / vWidth, targetHeight / vHeight);
          const w = vWidth * scale;
          const h = vHeight * scale;
          const x = (targetWidth - w) / 2;
          const y = (targetHeight - h) / 2;
          ctx.drawImage(video, x, y, w, h);
        }
      } else {
        // 16:9 Horizontal or Normal Landscape mode
        const scale = Math.min(targetWidth / vWidth, targetHeight / vHeight);
        const w = vWidth * scale;
        const h = vHeight * scale;
        const x = (targetWidth - w) / 2;
        const y = (targetHeight - h) / 2;
        ctx.drawImage(video, x, y, w, h);
      }
      videoDrawSucceeded = true;
    } catch (drawErr) {
      videoDrawSucceeded = false;
    }
  }

  // Graceful visual backdrop if video is not decoded, blocked by CORS, or in stream preview
  if (!videoDrawSucceeded) {
    if (thumbnailImage && thumbnailImage.complete && thumbnailImage.naturalWidth > 0) {
      try {
        const tWidth = thumbnailImage.naturalWidth;
        const tHeight = thumbnailImage.naturalHeight;

        if (framing.orientation === "vertical") {
          // Darkened background fill
          const bgScale = Math.max(targetWidth / tWidth, targetHeight / tHeight);
          const bgW = tWidth * bgScale;
          const bgH = tHeight * bgScale;
          ctx.drawImage(thumbnailImage, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);

          ctx.fillStyle = "rgba(10, 10, 12, 0.72)";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Foreground sharp with subtle Ken Burns zoom (1.0 to 1.03)
          const zoom = 1.0 + progress * 0.03;
          const mainScale = (targetWidth / tWidth) * zoom;
          const mainW = tWidth * mainScale;
          const mainH = tHeight * mainScale;
          const mainX = (targetWidth - mainW) / 2;
          const mainY = (targetHeight - mainH) / 2;

          ctx.drawImage(thumbnailImage, mainX, mainY, mainW, mainH);
        } else {
          // Horizontal fit
          const scale = Math.max(targetWidth / tWidth, targetHeight / tHeight) * (1.0 + progress * 0.03);
          const w = tWidth * scale;
          const h = tHeight * scale;
          ctx.drawImage(thumbnailImage, (targetWidth - w) / 2, (targetHeight - h) / 2, w, h);
        }
        videoDrawSucceeded = true;
      } catch (thumbErr) {}
    }
  }

  // Dynamic visual waveforms and title if still unrendered
  if (!videoDrawSucceeded) {
    ctx.save();
    // Dynamic animated gradient background
    const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
    grad.addColorStop(0, "#18181b");
    grad.addColorStop(0.5, "#27272a");
    grad.addColorStop(1, "#09090b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Dynamic visual audio waveforms
    ctx.fillStyle = "#f59e0b";
    const barsCount = 24;
    const barWidth = targetWidth * 0.015;
    const barGap = targetWidth * 0.008;
    const totalBarsWidth = barsCount * (barWidth + barGap);
    const startBarX = (targetWidth - totalBarsWidth) / 2;
    const centerBarY = targetHeight * 0.45;

    for (let b = 0; b < barsCount; b++) {
      const freq = Math.sin((progress * 20) + b * 0.5) * 0.5 + 0.5;
      const barH = targetHeight * 0.08 * (0.2 + freq * 0.8);
      ctx.fillRect(startBarX + b * (barWidth + barGap), centerBarY - barH / 2, barWidth, barH);
    }

    // Title & Hook text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(targetWidth * 0.038)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(clip?.title || "Viral Clip Highlight", targetWidth / 2, targetHeight * 0.58);

    if (clip?.viralScore) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = `bold ${Math.round(targetWidth * 0.024)}px system-ui, sans-serif`;
      ctx.fillText(`🔥 Skor Viral: ${clip.viralScore}/100 • AI Highlight`, targetWidth / 2, targetHeight * 0.63);
    }

    ctx.restore();
  }
}

function applyTransitionIn(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: VideoClipSegment["transition"],
  progress: number
) {
  if (type === "dip-black") {
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - progress})`;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "wipe") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(width * progress, 0, width * (1 - progress), height);
  }
}

function applyTransitionOut(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: VideoClipSegment["transition"],
  progress: number
) {
  if (type === "dip-black") {
    ctx.fillStyle = `rgba(0, 0, 0, ${progress})`;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "wipe") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width * progress, height);
  }
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  watermark: WatermarkConfig,
  targetWidth: number,
  targetHeight: number,
  imageElement?: HTMLImageElement | null
) {
  ctx.save();
  ctx.globalAlpha = watermark.opacity;

  // Calculate position coordinates
  let posX = targetWidth * 0.05;
  let posY = targetHeight * 0.08;
  const paddingX = targetWidth * 0.04;
  const paddingY = targetHeight * 0.05;

  switch (watermark.position) {
    case "top-left":
      posX = paddingX;
      posY = paddingY;
      break;
    case "top-right":
      posX = targetWidth - paddingX;
      posY = paddingY;
      break;
    case "bottom-left":
      posX = paddingX;
      posY = targetHeight - paddingY;
      break;
    case "bottom-right":
      posX = targetWidth - paddingX;
      posY = targetHeight - paddingY;
      break;
    case "center":
      posX = targetWidth / 2;
      posY = targetHeight / 2;
      break;
    case "custom":
      posX = (watermark.customX / 100) * targetWidth;
      posY = (watermark.customY / 100) * targetHeight;
      break;
  }

  ctx.translate(posX, posY);
  if (watermark.rotation !== 0) {
    ctx.rotate((watermark.rotation * Math.PI) / 180);
  }

  if (watermark.type === "image" && imageElement && imageElement.complete) {
    // Image Watermark
    const baseW = (targetWidth * 0.18) * watermark.scale;
    const aspect = imageElement.naturalWidth / (imageElement.naturalHeight || 1);
    const baseH = baseW / aspect;

    let drawX = 0;
    let drawY = 0;
    if (watermark.position === "top-right" || watermark.position === "bottom-right") {
      drawX = -baseW;
    } else if (watermark.position === "center") {
      drawX = -baseW / 2;
      drawY = -baseH / 2;
    }

    if (watermark.position === "bottom-left" || watermark.position === "bottom-right") {
      drawY = -baseH;
    }

    if (watermark.shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    ctx.drawImage(imageElement, drawX, drawY, baseW, baseH);
  } else {
    // Text Watermark
    const fontSize = Math.round(targetWidth * 0.026 * watermark.scale);
    ctx.font = `bold ${fontSize}px ${watermark.font || "sans-serif"}`;

    const text = watermark.text || "@AutoClipAI";
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = fontSize;

    let drawX = 0;
    let drawY = 0;
    if (watermark.position === "top-right" || watermark.position === "bottom-right") {
      drawX = -textW;
    } else if (watermark.position === "center") {
      drawX = -textW / 2;
      drawY = textH / 3;
    }
    if (watermark.position === "bottom-left" || watermark.position === "bottom-right") {
      drawY = -textH / 2;
    }

    // Optional background pill
    if (watermark.bgOpacity > 0) {
      ctx.fillStyle = watermark.bgColor || "#000000";
      ctx.globalAlpha = watermark.opacity * watermark.bgOpacity;
      const pillPad = fontSize * 0.35;
      roundRect(
        ctx,
        drawX - pillPad,
        drawY - textH + pillPad * 0.5,
        textW + pillPad * 2,
        textH + pillPad * 1.2,
        fontSize * 0.3
      );
      ctx.fill();
      ctx.globalAlpha = watermark.opacity;
    }

    if (watermark.shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Text stroke for ultra-high legibility
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = Math.max(2, fontSize * 0.12);
    ctx.strokeText(text, drawX, drawY);

    ctx.fillStyle = watermark.textColor || "#FFFFFF";
    ctx.fillText(text, drawX, drawY);
  }

  ctx.restore();
}

function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  subtitles: { start: number; end: number; text: string; highlight?: string; color?: string }[],
  currentTime: number,
  targetWidth: number,
  targetHeight: number,
  config: SubtitleConfig
) {
  const activeSub = subtitles.find((s) => currentTime >= s.start && currentTime <= s.end);
  if (!activeSub) return;

  ctx.save();
  const fontSize = Math.round(targetWidth * 0.048 * (config.fontSize / 32));
  ctx.font = `900 ${fontSize}px "Montserrat", "Impact", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const posX = targetWidth / 2;
  const posY = (config.positionY / 100) * targetHeight;

  const rawText = config.uppercase ? activeSub.text.toUpperCase() : activeSub.text;

  // Split into words for highlight effects
  const words = rawText.split(" ");
  const highlightWord = (activeSub.highlight || "").toUpperCase();

  ctx.translate(posX, posY);

  // Subtle bounce animation for current subtitle
  if (config.animatedPop) {
    const elapsed = currentTime - activeSub.start;
    if (elapsed < 0.18) {
      const popScale = 1 + (0.18 - elapsed) * 0.8;
      ctx.scale(popScale, popScale);
    }
  }

  const spaceWidth = ctx.measureText(" ").width;
  let totalWidth = 0;
  const wordWidths = words.map((w) => {
    const width = ctx.measureText(w).width;
    totalWidth += width;
    return width;
  });
  totalWidth += spaceWidth * (words.length - 1);

  // Draw background badge for Hormozi / MrBeast style
  if (config.style === "hormozi" || config.style === "mrbeast") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    const pad = fontSize * 0.3;
    roundRect(
      ctx,
      -totalWidth / 2 - pad,
      -fontSize / 2 - pad * 0.6,
      totalWidth + pad * 2,
      fontSize + pad * 1.2,
      fontSize * 0.25
    );
    ctx.fill();
  }

  let startX = -totalWidth / 2;

  words.forEach((word, i) => {
    const wWidth = wordWidths[i];
    const isHighlighted = highlightWord && word.includes(highlightWord);

    const wordCenterX = startX + wWidth / 2;

    // Heavy black stroke outline
    ctx.lineWidth = Math.max(3, fontSize * 0.16);
    ctx.strokeStyle = "#000000";
    ctx.lineJoin = "round";
    ctx.strokeText(word, wordCenterX, 0);

    // Fill color
    if (isHighlighted) {
      ctx.fillStyle = config.highlightColor || activeSub.color || "#FFE600";
    } else {
      ctx.fillStyle = config.textColor || "#FFFFFF";
    }
    ctx.fillText(word, wordCenterX, 0);

    startX += wWidth + spaceWidth;
  });

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
