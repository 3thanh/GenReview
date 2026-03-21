import { Zap, LayoutGrid, Sparkles } from "lucide-react";
import { FeedSourceToggle } from "./FeedSourceToggle";
import { PersonaSwitcher } from "./PersonaSwitcher";
import type { FeedSourceMode } from "../lib/feed-source";
import type { Persona } from "../lib/personas";

interface FeedContext {
  personas: Persona[];
  activePersona: Persona;
  feedSourceMode: FeedSourceMode;
  onChangeFeedSourceMode: (mode: FeedSourceMode) => void;
  onSelectPersona: (personaId: string) => void;
  onCreatePersona: () => void;
  stats: { remaining: number; approved: number; rejected: number };
}

interface NavbarProps {
  activeView: "feed" | "studio";
  onNavigate: (view: "feed" | "studio") => void;
  feedContext?: FeedContext;
}

export function Navbar({ activeView, onNavigate, feedContext }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-slate-200/75 bg-white/58 px-4 pr-8 backdrop-blur-xl sm:px-6 sm:pr-10">
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_100%)] shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
          <Zap className="h-3 w-3 text-white" />
        </div>
        <span className="hidden text-[13px] font-extrabold tracking-tight text-slate-900 lg:block">
          ContentSwipe
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/78 p-0.5">
        <button
          onClick={() => onNavigate("feed")}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            activeView === "feed"
              ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="h-3 w-3" />
          Feed
        </button>
        <button
          onClick={() => onNavigate("studio")}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            activeView === "studio"
              ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Studio
        </button>
      </div>

      {feedContext && (
        <PersonaSwitcher
          personas={feedContext.personas}
          current={feedContext.activePersona}
          onSelect={(p) => feedContext.onSelectPersona(p.id)}
          onCreateNew={feedContext.onCreatePersona}
        />
      )}

      <div className="flex-1" />

      {feedContext && (
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-slate-200/60 bg-white/60 px-2 py-0.5">
            <span className="text-xs font-bold text-slate-900">
              {feedContext.stats.remaining}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              left
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5">
            <span className="text-xs font-bold text-emerald-600">
              {feedContext.stats.approved}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-500/70">
              yes
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50/80 px-2 py-0.5">
            <span className="text-xs font-bold text-rose-600">
              {feedContext.stats.rejected}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-400/70">
              no
            </span>
          </div>
        </div>
      )}

      {feedContext ? (
        <FeedSourceToggle
          value={feedContext.feedSourceMode}
          onChange={feedContext.onChangeFeedSourceMode}
        />
      ) : (
        <div />
      )}
    </nav>
  );
}
