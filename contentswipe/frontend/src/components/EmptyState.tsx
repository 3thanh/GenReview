import { Inbox, Sparkles } from "lucide-react";
import type { Persona } from "../types/database";

interface EmptyStateProps {
  persona: Persona;
  onNavigateToStudio: () => void;
}

export function EmptyState({ persona, onNavigateToStudio }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mb-6">
        <Inbox className="w-9 h-9 text-zinc-500" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        {persona.emptyStateMessage}
      </h2>
      <p className="text-sm text-zinc-400 mb-8 max-w-xs">
        Generate new content in the studio and it will appear here for review.
      </p>
      <button
        onClick={onNavigateToStudio}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {persona.emptyStateCta}
      </button>
    </div>
  );
}
