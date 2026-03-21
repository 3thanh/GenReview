import { useState, useRef, useEffect } from "react";
import { ChevronDown, Layers, Video, Headphones, Share2 } from "lucide-react";
import type { Persona } from "../types/database";
import { PERSONAS } from "../types/database";

const ICONS: Record<string, typeof Layers> = {
  layers: Layers,
  video: Video,
  headset: Headphones,
  share: Share2,
};

interface PersonaSwitcherProps {
  current: Persona;
  onSelect: (p: Persona) => void;
}

export function PersonaSwitcher({ current, onSelect }: PersonaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const Icon = ICONS[current.icon] ?? Layers;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-800 transition-colors"
      >
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200">{current.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-xl shadow-black/30 py-1 z-50 animate-fade-in">
          {PERSONAS.map((p) => {
            const PIcon = ICONS[p.icon] ?? Layers;
            const isActive = p.id === current.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/50 transition-colors ${
                  isActive ? "bg-zinc-800/30" : ""
                }`}
              >
                <PIcon
                  className={`w-4 h-4 mt-0.5 ${isActive ? "text-white" : "text-zinc-500"}`}
                />
                <div>
                  <p className={`text-sm font-medium ${isActive ? "text-white" : "text-zinc-300"}`}>
                    {p.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-tight">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
