// types/yt.d.ts
interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  destroy(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVideoLoadedFraction(): number;
  getPlaybackQuality(): string;
  setPlaybackQuality(suggestedQuality: string): void;
  getVideoUrl(): string;
  getVideoEmbedCode(): string;
}

interface Window {
  YT?: {
    Player: new (elementId: string | HTMLDivElement, options: any) => YouTubePlayer;
    PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  };
  onYouTubeIframeAPIReady?: () => void;
}
