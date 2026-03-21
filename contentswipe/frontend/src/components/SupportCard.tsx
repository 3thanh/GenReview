import { Headphones, MessageSquare, ExternalLink } from "lucide-react";
import type { ContentItem } from "../types/database";

export function SupportCard({ card }: { card: ContentItem }) {
  const metadata = card.metadata as Record<string, any> | null;
  const sourceRef = metadata?.source_ref as string | undefined;

  return (
    <div className="px-5 pb-4">
      {/* Channel indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
          <Headphones className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400">Support Reply</p>
          {sourceRef && (
            <p className="text-[11px] text-zinc-500 truncate">{sourceRef}</p>
          )}
        </div>
      </div>

      {/* Screenshot / image — screenshot-first for support */}
      {card.thumbnail_url && (
        <div className="rounded-xl overflow-hidden border border-zinc-700/30 mb-4">
          <img
            src={card.thumbnail_url}
            alt="Support context"
            className="w-full object-cover max-h-56"
          />
        </div>
      )}

      {/* Title */}
      <h2 className="text-lg font-semibold text-white mb-2 leading-tight">
        {card.title}
      </h2>

      {/* Draft response */}
      {card.description && (
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="w-3 h-3 text-zinc-500" />
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
              Draft Reply
            </p>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-5">
            {card.description}
          </p>
        </div>
      )}
    </div>
  );
}
