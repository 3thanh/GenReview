import { useState, useRef, useEffect } from "react";
import { ChevronDown, Layers, Video, Plane, Building2, Gamepad2, Coffee, User } from "lucide-react";
import type { Persona } from "../lib/personas";

const ICONS: Record<Persona["icon"], typeof Layers> = {
  layers: Layers,
  video: Video,
  plane: Plane,
  building: Building2,
  gamepad: Gamepad2,
  coffee: Coffee,
  user: User,
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
        className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/78 px-3 py-1.5 text-left transition-colors hover:bg-white"
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${current.color}18` }}
        >
          <Icon className="h-3 w-3" style={{ color: current.color }} />
        </div>
        <span className="text-xs font-semibold text-slate-900">{current.name}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="surface-panel absolute left-0 top-full z-50 mt-3 w-80 rounded-[28px] p-2">
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
                className={`flex w-full items-start gap-3 rounded-[22px] px-3 py-3 text-left transition-colors ${
                  isActive ? "bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div
                  className="rounded-2xl p-2"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.12)" : `${persona.color}15`,
                  }}
                >
                  <PersonaIcon
                    className="h-4 w-4"
                    style={{ color: isActive ? "white" : persona.color }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{persona.name}</p>
                  <p className={`mt-1 text-xs leading-5 ${isActive ? "text-white/70" : "text-slate-500"}`}>
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
