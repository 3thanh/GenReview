import { useState, useRef, useEffect } from "react";
import { ChevronDown, Layers, Video, Headphones, Share2 } from "lucide-react";
import type { Persona } from "../lib/personas";

const ICONS: Record<Persona["icon"], typeof Layers> = {
  layers: Layers,
  video: Video,
  headset: Headphones,
  share: Share2,
};

interface PersonaSwitcherProps {
  personas: Persona[];
  current: Persona;
  onSelect: (persona: Persona) => void;
}

export function PersonaSwitcher({
  personas,
  current,
  onSelect,
}: PersonaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-left hover:bg-zinc-900 transition-colors"
      >
        <Icon className="h-4 w-4 text-zinc-400" />
        <div>
          <p className="text-sm font-medium text-white">{current.name}</p>
          <p className="text-[11px] text-zinc-500">Persona Mode</p>
        </div>
        <ChevronDown className="ml-1 h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
          {personas.map((persona) => {
            const PersonaIcon = ICONS[persona.icon] ?? Layers;
            const isActive = persona.id === current.id;

            return (
              <button
                key={persona.id}
                onClick={() => {
                  onSelect(persona);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  isActive ? "bg-zinc-900 text-white" : "hover:bg-zinc-900/80 text-zinc-300"
                }`}
              >
                <div className="rounded-xl border border-zinc-800 bg-black/40 p-2">
                  <PersonaIcon className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{persona.name}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {persona.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
