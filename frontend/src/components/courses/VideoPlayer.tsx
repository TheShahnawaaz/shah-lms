import React from "react";
import { AlertCircle } from "lucide-react";

interface VideoDetails {
  id: number;
  title: string;
  type: string;
  youtubeLink?: string | null;
  time_in_minutes?: number | null;
  description?: string | null;
  thumbnail?: string | null;
}

interface VideoPlayerProps {
  video: VideoDetails;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const isYoutube = video.type === "YOUTUBE" && video.youtubeLink;
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

  if (isYoutube) {
    const embedUrl = isTauri
      ? `https://lms.theshahnawaz.in/youtube-embed/${video.youtubeLink}`
      : `https://www.youtube-nocookie.com/embed/${video.youtubeLink}?autoplay=0&rel=0`;

    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-border shadow-lg bg-black">
        <iframe
          src={embedUrl}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // DRM Video / VdoCipher / Unsupported Embed fallback
  return (
    <div className="w-full aspect-video rounded-2xl border border-border bg-muted/10 p-6 flex flex-col items-center justify-center text-center gap-3 relative">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 shrink-0">
        <AlertCircle size={22} />
      </div>
      
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-sm font-semibold text-foreground">DRM Encrypted Resource</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The video <span className="font-medium text-foreground">"{video.title}"</span> is encrypted and cannot be played directly within this frame.
        </p>
      </div>
    </div>
  );
};
export default VideoPlayer;
