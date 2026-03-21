import type { FeedSourceMode } from "../lib/feed-source";

interface FeedSourceToggleProps {
  value: FeedSourceMode;
  onChange: (value: FeedSourceMode) => void;
}

const OPTIONS: Array<{ value: FeedSourceMode; label: string }> = [
  { value: "real", label: "Real" },
  { value: "demo", label: "Demo" },
];

export function FeedSourceToggle({ value, onChange }: FeedSourceToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-200/90 bg-white/78 p-0.5">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.16)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
