import { Linkedin, Twitter, Share2 } from "lucide-react";
import type { ContentItem } from "../types/database";

export function SocialCard({ card }: { card: ContentItem }) {
  return (
    <div className="px-5 pb-4">
      {/* Channel indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
          <Linkedin className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">LinkedIn Post</p>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-white mb-3 leading-tight">
        {card.title}
      </h2>

      {/* Post body — text-first for social */}
      {card.description && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/30 mb-3">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {card.description}
          </p>
        </div>
      )}

      {/* Thumbnail if present */}
      {card.thumbnail_url && (
        <img
          src={card.thumbnail_url}
          alt=""
          className="w-full rounded-lg border border-zinc-700/30"
        />
      )}
    </div>
  );
}
