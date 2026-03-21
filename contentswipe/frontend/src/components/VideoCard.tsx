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
          <div className="group relative mb-5 aspect-video overflow-hidden rounded-[24px] bg-slate-900">
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
              className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/20"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 text-white" />
                )}
              </div>
            </button>

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/30 bg-white/22 px-3 py-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setMuted((current) => !current)}
                className="text-white/90 transition-colors hover:text-white"
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

            {!isPlaying && duration > 0 && (
              <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-slate-950/45 px-3 py-1 backdrop-blur-md">
                <span className="font-mono text-xs font-medium text-white">
                  {formatTime(currentTime)}
                </span>
              </div>
            )}

            {duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="h-1 bg-white/15">
                  <div
                    className="h-full bg-white/75 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : card.thumbnail_url ? (
          <div className="relative mb-5 aspect-video overflow-hidden rounded-[24px] bg-slate-900">
            <img
              src={card.thumbnail_url}
              alt={card.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Film className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-slate-950/45 px-3 py-1 backdrop-blur-md">
              <span className="text-[11px] font-medium text-white/90">Rendering…</span>
            </div>
          </div>
        ) : (
          <div className="surface-muted mb-4 flex aspect-video flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed">
            <Film className="h-8 w-8 text-slate-400" />
            <span className="text-xs text-slate-500">Video generating…</span>
          </div>
        )}

        <h2 className="mb-2 text-xl font-bold leading-tight text-slate-900">
          {card.title}
        </h2>

        {card.script && (
          <div className="surface-muted rounded-[22px] p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Script
            </p>
            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {card.script}
            </p>
          </div>
        )}

        {card.body_text && !card.script && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
            {card.body_text}
          </p>
        )}
      </div>
    );
  }
);
