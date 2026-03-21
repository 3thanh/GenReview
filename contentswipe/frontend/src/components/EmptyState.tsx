import { Film, Sparkles } from "lucide-react";
import type { Persona } from "../lib/personas";

interface EmptyStateProps {
  persona: Persona;
  onNavigateToStudio: () => void;
}

export function EmptyState({ persona, onNavigateToStudio }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="surface-panel mb-6 flex h-24 w-24 items-center justify-center rounded-full">
        <Film className="h-9 w-9 text-slate-400" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        {persona.emptyStateMessage}
      </h2>
      <p className="mb-8 max-w-sm text-sm leading-6 text-slate-500">
        Generate new videos in the studio and they will appear here for review.
      </p>
      <button
        onClick={onNavigateToStudio}
        className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
      >
        <Sparkles className="w-4 h-4" />
        {persona.emptyStateCta}
      </button>
    </div>
  );
}
