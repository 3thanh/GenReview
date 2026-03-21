import { useRef } from "react";
import { Play, Pause, Film } from "lucide-react";
import type { ContentItem } from "../types/database";

interface VideoCardProps {
  card: ContentItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function VideoCard({ card, isPlaying, onTogglePlay }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    onTogglePlay();
  };

  return (
    <div className="px-5 pb-4">
      {card.video_url ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4 group">
          <video
            ref={videoRef}
            src={card.video_url}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
            poster={card.thumbnail_url ?? undefined}
          />
          <button
            onClick={handleToggle}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </div>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-zinc-800/50 aspect-video mb-4 flex flex-col items-center justify-center gap-2 border border-zinc-700/50 border-dashed">
          <Film className="w-8 h-8 text-zinc-600" />
          <span className="text-xs text-zinc-500">Video generating...</span>
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mb-2 leading-tight">
        {card.title}
      </h2>

      {card.script && (
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
          <p className="text-xs text-zinc-400 font-medium mb-1.5 uppercase tracking-wider">
            Script
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {card.script}
          </p>
        </div>
      )}

      {card.body_text && !card.script && (
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
          {card.body_text}
        </p>
      )}
    </div>
  );
}
