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
    <div className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-950/90 p-1 shadow-[0_14px_40px_rgba(0,0,0,0.32)]">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[14px] px-4 py-2 text-left transition ${
              isActive
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
            aria-pressed={isActive}
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p className={`text-[11px] ${isActive ? "text-zinc-700" : "text-zinc-500"}`}>
              {option.caption}
            </p>
          </button>
        );
      })}
    </div>
  );
}
