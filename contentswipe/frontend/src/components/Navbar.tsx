import { Zap, LayoutGrid, Sparkles } from "lucide-react";

interface NavbarProps {
  activeView: "feed" | "studio";
  onNavigate: (view: "feed" | "studio") => void;
}

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  return (
    <nav className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-5 bg-black/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-white">
          ContentSwipe
        </span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-1">
        <button
          onClick={() => onNavigate("feed")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === "feed"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Feed
        </button>
        <button
          onClick={() => onNavigate("studio")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === "studio"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Studio
        </button>
      </div>

      {/* Right side placeholder */}
      <div className="w-20" />
    </nav>
  );
}
