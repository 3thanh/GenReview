import { Zap, LayoutGrid, Sparkles, Bell, Search } from "lucide-react";

interface NavbarProps {
  activeView: "feed" | "studio";
  onNavigate: (view: "feed" | "studio") => void;
}

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/75 bg-white/58 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_100%)] shadow-[0_12px_30px_rgba(37,99,235,0.24)]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="block text-base font-extrabold tracking-tight text-slate-900">
            ContentSwipe
          </span>
          <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Review Workspace
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white/74 px-4 py-2 text-sm text-slate-400 shadow-[0_8px_24px_rgba(148,163,184,0.08)] lg:flex">
        <Search className="h-4 w-4" />
        <span>Search cards, prompts, personas</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/78 p-1 shadow-[0_10px_28px_rgba(148,163,184,0.08)]">
        <button
          onClick={() => onNavigate("feed")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            activeView === "feed"
              ? "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Feed
        </button>
        <button
          onClick={() => onNavigate("studio")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            activeView === "studio"
              ? "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Studio
        </button>
        </div>

        <button className="surface-pill flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-900">
          <Bell className="h-4 w-4" />
        </button>

        <div className="surface-pill hidden items-center gap-3 rounded-full px-2.5 py-2 pr-4 sm:flex">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#bfdbfe_0%,#e2e8f0_100%)] text-xs font-bold text-slate-700">
            CS
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Live Demo</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Prototype
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
