import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Play, Pause, Film, Volume2, VolumeX } from "lucide-react";
import type { ContentItem } from "../types/database";

export interface VideoCardHandle {
  getCurrentTime: () => number;
  pause: () => void;
}

interface VideoCardProps {
  card: ContentItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(
  function VideoCard({ card, isPlaying, onTogglePlay }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(true);
    const [volume, setVolume] = useState(0.8);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      pause: () => {
        videoRef.current?.pause();
      },
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onTime = () => setCurrentTime(video.currentTime);
      const onMeta = () => setDuration(video.duration);

      video.addEventListener("timeupdate", onTime);
      video.addEventListener("loadedmetadata", onMeta);

      return () => {
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("loadedmetadata", onMeta);
      };
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      video.muted = muted;
      video.volume = volume;
    }, [muted, volume]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !card.video_url) return;

      if (isPlaying) {
        void video.play().catch(() => {});
        return;
      }

      video.pause();
    }, [card.video_url, isPlaying]);

    useEffect(() => {
      setCurrentTime(0);
      setDuration(0);
      setMuted(true);
    }, [card.id]);

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

    const handleVolumeChange = (nextVolume: number) => {
      setVolume(nextVolume);
      if (nextVolume > 0 && muted) {
        setMuted(false);
      }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setMuted((current) => !current)}
                className="text-zinc-100 transition-colors hover:text-white"
                aria-label={muted ? "Unmute video" : "Mute video"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                className="h-1.5 w-20 accent-white"
                aria-label="Video volume"
              />
            </div>

            {/* Paused timestamp overlay */}
            {!isPlaying && duration > 0 && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                <span className="text-xs text-white font-mono font-medium">
                  {formatTime(currentTime)}
                </span>
              </div>
            )}

            {/* Progress bar */}
            {duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="h-1 bg-white/10">
                  <div
                    className="h-full bg-white/60 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
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
);
