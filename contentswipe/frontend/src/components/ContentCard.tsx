import { forwardRef } from "react";
import { Star } from "lucide-react";
import type { ContentItem } from "../types/database";
import { VideoCard } from "./VideoCard";
import type { VideoCardHandle } from "./VideoCard";

interface ContentCardProps {
  card: ContentItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
  videoRef?: React.Ref<VideoCardHandle>;
}

export const ContentCard = forwardRef<unknown, ContentCardProps>(
  function ContentCard({ card, isPlaying, onTogglePlay, videoRef }) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[min(92vw,980px)]">
        <div className="surface-card flex h-full max-h-[calc(100vh-13rem)] w-full flex-col overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 pb-3 pt-4 lg:px-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                Video
              </span>
              {card.channel && (
                <span className="text-[10px] capitalize text-slate-400">
                  {card.channel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {card.starred && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
              <span className="text-xs text-slate-400">
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
          </div>

          <VideoCard
            ref={videoRef}
            card={card}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
          />

          {(card.variant_of || card.parent_id) && (
            <div className="px-5 pb-3 lg:px-6">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
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
