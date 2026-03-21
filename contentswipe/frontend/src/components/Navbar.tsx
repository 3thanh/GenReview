import { Zap, LayoutGrid, Sparkles, Search } from "lucide-react";
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
  stats: { remaining: number; approved: number; rejected: number };
}

interface NavbarProps {
  activeView: "feed" | "studio";
  onNavigate: (view: "feed" | "studio") => void;
  feedContext?: FeedContext;
}

export function Navbar({ activeView, onNavigate, feedContext }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/75 bg-white/58 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_100%)] shadow-[0_8px_20px_rgba(37,99,235,0.24)]">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="hidden text-sm font-extrabold tracking-tight text-slate-900 sm:block">
          ContentSwipe
        </span>
      </div>

      {feedContext && (
        <div className="flex items-center gap-2">
          <PersonaSwitcher
            personas={feedContext.personas}
            current={feedContext.activePersona}
            onSelect={(p) => feedContext.onSelectPersona(p.id)}
          />
        </div>
      )}

      <div className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white/74 px-3 py-1.5 text-xs text-slate-400 shadow-[0_4px_12px_rgba(148,163,184,0.06)] xl:flex">
        <Search className="h-3.5 w-3.5" />
        <span>Search cards, prompts, personas</span>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/78 p-0.5 shadow-[0_4px_12px_rgba(148,163,184,0.06)]">
        <button
          onClick={() => onNavigate("feed")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            activeView === "feed"
              ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Feed
        </button>
        <button
          onClick={() => onNavigate("studio")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            activeView === "studio"
              ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Studio
        </button>
      </div>

      {feedContext && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/60 px-2 py-1">
            <span className="text-sm font-bold leading-none text-slate-900">
              {feedContext.stats.remaining}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Remaining
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2 py-1">
            <span className="text-sm font-bold leading-none text-approve">
              {feedContext.stats.approved}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Approved
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/90 px-2 py-1">
            <span className="text-sm font-bold leading-none text-reject">
              {feedContext.stats.rejected}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Rejected
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
