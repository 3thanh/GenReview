import type { FeedSourceMode } from "../lib/feed-source";

interface FeedSourceToggleProps {
  value: FeedSourceMode;
  onChange: (value: FeedSourceMode) => void;
}

const OPTIONS: Array<{
  value: FeedSourceMode;
  label: string;
  caption: string;
}> = [
  {
    value: "real",
    label: "Real",
    caption: "Live Supabase queue",
  },
  {
    value: "demo",
    label: "Demo",
    caption: "Seeded cached cards",
  },
];

export function FeedSourceToggle({ value, onChange }: FeedSourceToggleProps) {
  return (
    <div className="surface-pill inline-flex rounded-[22px] p-1">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[14px] px-4 py-2 text-left transition ${
              isActive
                ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                : "text-slate-500 hover:bg-white hover:text-slate-900"
            }`}
            aria-pressed={isActive}
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p className={`text-[11px] ${isActive ? "text-white/70" : "text-slate-400"}`}>
              {option.caption}
            </p>
          </button>
        );
      })}
    </div>
  );
}
