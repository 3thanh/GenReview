import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowRight,
  Layers,
  Video,
  Plane,
  Building2,
  Gamepad2,
  Coffee,
  User,
} from "lucide-react";
import type { Persona, PersonaIcon } from "../lib/personas";

const ICONS: Record<PersonaIcon, typeof Layers> = {
  layers: Layers,
  video: Video,
  plane: Plane,
  building: Building2,
  gamepad: Gamepad2,
  coffee: Coffee,
  user: User,
};

const SAMPLE_VIDEOS: Record<string, { url: string; title: string; thumbnail: string }> = {
  "airplane-ai": {
    url: "https://rnqkjfrwkyupkyvygtpg.supabase.co/storage/v1/object/public/content-videos/uploads/resonate-reel-1774112768901.mp4",
    title: "AI Models on a Crashing Plane",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
  },
  "cerebral-valley": {
    url: "https://rnqkjfrwkyupkyvygtpg.supabase.co/storage/v1/object/public/content-videos/uploads/1774114548692-cv-ad.mp4",
    title: "Where AI Builders Go — Cerebral Valley",
    thumbnail: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
  },
  "pokemon-infomercial": {
    url: "https://rnqkjfrwkyupkyvygtpg.supabase.co/storage/v1/object/public/content-videos/uploads/1774120280331-geodude-ad.mp4",
    title: "GEODUDE™ Infomercial — Stability You Can Trust",
    thumbnail: "https://images.unsplash.com/photo-1518806118471-f28b20a1d79d?auto=format&fit=crop&w=1200&q=80",
  },
  "coffee-roastery": {
    url: "https://rnqkjfrwkyupkyvygtpg.supabase.co/storage/v1/object/public/content-videos/uploads/1774120474320-acme-coffee-morning-ritual.mp4",
    title: "Acme Coffee Co: Elevate Your Morning Ritual",
    thumbnail: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  all: {
    url: "https://rnqkjfrwkyupkyvygtpg.supabase.co/storage/v1/object/public/content-videos/uploads/resonate-reel-1774112768901.mp4",
    title: "AI Models on a Crashing Plane",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
  },
};

interface PersonaPreviewProps {
  persona: Persona;
  onContinue: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersonaPreview({ persona, onContinue }: PersonaPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const sample = SAMPLE_VIDEOS[persona.id] ?? SAMPLE_VIDEOS["all"];
  const Icon = ICONS[persona.icon] ?? Layers;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => setCurrentTime(vid.currentTime);
    const onMeta = () => setDuration(vid.duration);
    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("loadedmetadata", onMeta);
    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [playing]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 28, stiffness: 260, delay: 0.05 }}
          className="flex w-full max-w-2xl flex-col items-center"
        >
          {/* Persona header */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: `${persona.color}20`, boxShadow: `0 8px 32px ${persona.color}25` }}
            >
              <Icon className="h-6 w-6" style={{ color: persona.color }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                {persona.name}
              </h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
                {persona.description}
              </p>
            </div>
          </div>

          {/* Sample video */}
          <div className="group relative w-full overflow-hidden rounded-[22px] bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="aspect-[16/9]">
              <video
                ref={videoRef}
                src={sample.url}
                poster={sample.thumbnail}
                className="h-full w-full object-cover"
                loop
                muted={muted}
                playsInline
                autoPlay
              />
            </div>

            {/* Play / pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/15"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                {playing ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 text-white" />
                )}
              </div>
            </button>

            {/* Volume control */}
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/18 px-2.5 py-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="text-white/90 transition-colors hover:text-white"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Sample label */}
            <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-950/50 px-3 py-1 backdrop-blur-md">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                Sample
              </span>
            </div>

            {/* Video title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent px-4 pb-4 pt-10">
              <p className="text-sm font-bold text-white">{sample.title}</p>
              {duration > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-white/60">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              )}
            </div>

            {/* Progress bar */}
            {duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="h-[3px] bg-white/15">
                  <div
                    className="h-full transition-[width] duration-200"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: persona.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* CTA button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onContinue}
            className="mt-6 flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${persona.color}, ${persona.color}cc)`,
              boxShadow: `0 8px 28px ${persona.color}35`,
            }}
          >
            Start Reviewing
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          <p className="mt-3 text-[11px] text-slate-400">
            Press <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">Enter</kbd> to continue
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
