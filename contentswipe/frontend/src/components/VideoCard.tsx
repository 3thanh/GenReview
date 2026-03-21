import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  Play,
  Pause,
  Film,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronDown,
  X,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { ContentItem } from "../types/database";

export interface VideoCardHandle {
  getCurrentTime: () => number;
  pause: () => void;
}

interface VideoCardProps {
  card: ContentItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRequestRegen?: (editedScript: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(
  function VideoCard({ card, isPlaying, onTogglePlay, onRequestRegen }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [fullscreen, setFullscreen] = useState(false);
    const [scriptOpen, setScriptOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editedScript, setEditedScript] = useState(card.script ?? "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      pause: () => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.muted = true;
        }
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
        video.pause();
        video.removeAttribute("src");
        video.load();
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
        video.play().catch(() => {
          if (!video.muted) {
            video.muted = true;
            setMuted(true);
            void video.play().catch(() => {});
          }
        });
      } else {
        video.pause();
        video.currentTime = video.currentTime;
      }

      return () => {
        video.pause();
      };
    }, [card.video_url, isPlaying]);

    useEffect(() => {
      setCurrentTime(0);
      setDuration(0);
      setScriptOpen(false);
      setEditing(false);
      setEditedScript(card.script ?? "");
      setFullscreen(false);
    }, [card.id, card.script]);

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

    const handleOpenScript = useCallback(() => {
      setScriptOpen(true);
      setEditedScript(card.script ?? "");
    }, [card.script]);

    const handleCloseScript = useCallback(() => {
      setScriptOpen(false);
      setEditing(false);
    }, []);

    const handleStartEditing = useCallback(() => {
      setEditing(true);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }, []);

    const handleSaveAndRegen = useCallback(() => {
      if (onRequestRegen && editedScript.trim()) {
        onRequestRegen(editedScript.trim());
      }
      setScriptOpen(false);
      setEditing(false);
    }, [editedScript, onRequestRegen]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const videoOverlay = (isFs: boolean) => (
      <>
        <button
          onClick={handleToggle}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/20"
        >
          <div className={`flex items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 ${isFs ? "h-14 w-14" : "h-11 w-11"}`}>
            {isPlaying ? (
              <Pause className={isFs ? "h-5 w-5 text-white" : "h-4 w-4 text-white"} />
            ) : (
              <Play className={`ml-0.5 ${isFs ? "h-5 w-5 text-white" : "h-4 w-4 text-white"}`} />
            )}
          </div>
        </button>

        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-white/30 bg-white/22 px-2 py-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMuted((current) => !current)}
            className="text-white/90 transition-colors hover:text-white"
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) =>
              handleVolumeChange(Number(event.target.value))
            }
            className="h-1 w-16 accent-white"
            aria-label="Video volume"
          />
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {!isPlaying && duration > 0 && (
            <div className="rounded-full border border-white/25 bg-slate-950/45 px-2.5 py-0.5 backdrop-blur-md">
              <span className="font-mono text-[11px] font-medium text-white">
                {formatTime(currentTime)}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-slate-950/45 text-white/90 backdrop-blur-md transition-colors hover:bg-slate-950/60 hover:text-white"
            aria-label={isFs ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFs ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-0.5 bg-white/15">
              <div
                className="h-full bg-white/75 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </>
    );

    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
        <h2 className="mb-1 text-base font-bold leading-snug text-slate-900">
          {card.title}
        </h2>

        {card.body_text && (
          <p className="mb-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
            {card.body_text}
          </p>
        )}

        {card.video_url ? (
          <div className="group relative mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-900">
            <video
              ref={videoRef}
              src={card.video_url}
              className="h-full w-full object-contain"
              loop
              playsInline
              poster={card.thumbnail_url ?? undefined}
            />
            {videoOverlay(false)}
          </div>
        ) : card.thumbnail_url ? (
          <div className="relative mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-900">
            <img
              src={card.thumbnail_url}
              alt={card.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Film className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute left-2 top-2 rounded-full border border-white/25 bg-slate-950/45 px-2.5 py-0.5 backdrop-blur-md">
              <span className="text-[10px] font-medium text-white/90">
                Rendering…
              </span>
            </div>
          </div>
        ) : (
          <div className="surface-muted mb-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed">
            <Film className="h-6 w-6 text-slate-400" />
            <span className="text-[10px] text-slate-500">
              Video generating…
            </span>
          </div>
        )}

        {fullscreen && card.video_url && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setFullscreen(false)}
          >
            <div
              className="group relative flex h-[92vh] max-w-[min(92vw,600px)] items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={card.video_url}
                className="h-full max-h-full w-auto rounded-2xl object-contain"
                loop
                muted={muted}
                playsInline
                autoPlay
              />
              {videoOverlay(true)}
            </div>
          </div>
        )}

        {card.script && !scriptOpen && (
          <button
            type="button"
            onClick={handleOpenScript}
            className="mt-auto flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-100"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              View Script
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}

        {scriptOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[28px] border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {card.title}
                </h3>
                <div className="flex items-center gap-2">
                  {!editing && (
                    <button
                      type="button"
                      onClick={handleStartEditing}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseScript}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {editing ? (
                  <textarea
                    ref={textareaRef}
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="min-h-[240px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {card.script}
                  </p>
                )}
              </div>

              {editing && (
                <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditedScript(card.script ?? "");
                    }}
                    className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndRegen}
                    className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Save & Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
