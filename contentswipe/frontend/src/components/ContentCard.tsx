import { forwardRef } from "react";
import type { ContentItem } from "../types/database";
import { VideoCard } from "./VideoCard";
import { SocialCard } from "./SocialCard";
import { SupportCard } from "./SupportCard";
import type { SupportCardHandle } from "./SupportCard";

interface ContentCardProps {
  card: ContentItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const ContentCard = forwardRef<SupportCardHandle, ContentCardProps>(
  function ContentCard({ card, isPlaying, onTogglePlay }, ref) {
    const typeLabel = {
      video_script: "Video",
      linkedin_post: "Social",
      support_reply: "Support",
    }[card.content_type];

    const typeBadgeColor = {
      video_script: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      linkedin_post: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      support_reply: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    }[card.content_type];

    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          {/* Type badge */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${typeBadgeColor}`}
            >
              {typeLabel}
            </span>
            <span className="text-xs text-zinc-500">
              {card.created_at
                ? new Date(card.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>

          {/* Card content by type */}
          {card.content_type === "video_script" && (
            <VideoCard card={card} isPlaying={isPlaying} onTogglePlay={onTogglePlay} />
          )}
          {card.content_type === "linkedin_post" && <SocialCard card={card} />}
          {card.content_type === "support_reply" && <SupportCard ref={ref} card={card} />}

          {/* Variant / lineage indicator */}
          {(card.variant_of || card.parent_id) && (
            <div className="px-5 pb-3">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3v12" /><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path d="M18 6c0 6-12 6-12 12" />
                </svg>
                {card.variant_of ? "Variant" : "Iteration"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);
