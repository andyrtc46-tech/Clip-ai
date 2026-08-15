export type PlatformType = 'youtube' | 'twitch' | 'kick' | 'upload' | 'sample';

export type HookCategory = 'Shock' | 'Curiosity' | 'Story' | 'Question' | 'Punchline' | 'Controversial';

export type TransitionType = 'cut' | 'crossfade' | 'dip-black' | 'wipe' | 'zoom';

export type OrientationType = 'vertical' | 'horizontal' | 'square' | 'portrait'; // 9:16, 16:9, 1:1, 4:5

export type ResolutionType = '480p' | '720p' | '1080p' | '1440p' | '4k';

export type FrameRateType = 24 | 30 | 60;

export interface SubtitleItem {
  start: number;
  end: number;
  text: string;
  highlight?: string;
  color?: string;
}

export interface VideoClipSegment {
  id: string;
  title: string;
  hookCategory: HookCategory;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number;
  hookSentence: string;
  whyItWorks: string;
  emotion: string;
  suggestedSubtitles?: SubtitleItem[];
  recommendedCropFocus?: 'center' | 'split-screen' | 'speaker';
  speed: number;
  volume: number;
  transition: TransitionType;
  isSelected: boolean;
}

export interface VideoSourceData {
  id: string;
  title: string;
  creator?: string;
  platform: PlatformType;
  url: string;
  videoUrl: string;
  youtubeId?: string;
  embedUrl?: string;
  thumbnail?: string;
  duration: number;
  isLocalFile?: boolean;
  transcript?: { start: number; end: number; text: string }[];
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  font: string;
  textColor: string;
  bgColor: string;
  bgOpacity: number;
  imageUrl: string | null;
  position: WatermarkPosition;
  customX: number; // percentage 0-100
  customY: number; // percentage 0-100
  opacity: number; // 0.1 - 1.0
  scale: number; // 0.5 - 2.5
  rotation: number; // -180 to 180 degrees
  shadow: boolean;
}

export interface SubtitleConfig {
  enabled: boolean;
  style: 'hormozi' | 'mrbeast' | 'clean' | 'cyberpunk';
  fontSize: number; // 18 - 48
  positionY: number; // percentage from top 50-90%
  highlightColor: string;
  textColor: string;
  backgroundColor?: string;
  uppercase: boolean;
  animatedPop: boolean;
}

export interface FramingConfig {
  orientation: OrientationType;
  backgroundMode: 'blur' | 'black' | 'gradient' | 'crop';
  splitScreen: boolean;
  panSpeed: number;
}

export interface ExportConfig {
  resolution: ResolutionType;
  fps: FrameRateType;
  orientation: OrientationType;
  format: 'mp4' | 'webm';
  mergeAllClips: boolean;
  transitionType: TransitionType;
  qualityBitrateMbps: number;
}

export interface RenderProgress {
  isRendering: boolean;
  progressPercent: number;
  currentStage: string;
  currentClipIndex: number;
  totalClips: number;
  error: string | null;
  renderedBlobUrl: string | null;
  downloadFilename: string | null;
  renderedFileSizeMb?: number;
}
