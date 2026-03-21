import { Linkedin, AtSign, Share2 } from "lucide-react";
import type { ContentItem } from "../types/database";

const CHANNEL_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  twitter: AtSign,
};

export function SocialCard({ card }: { card: ContentItem }) {
  const channel = card.channel ?? "linkedin";
  const ChannelIcon = CHANNEL_ICONS[channel] ?? Share2;
  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1);

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
          <ChannelIcon className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">{channelLabel} Post</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-3 leading-tight">
        {card.title}
      </h2>

      {card.body_text && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/30 mb-3">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {card.body_text}
          </p>
        </div>
      )}

      {(card.image_url || card.thumbnail_url) && (
        <img
          src={card.image_url ?? card.thumbnail_url!}
          alt=""
          className="w-full rounded-lg border border-zinc-700/30"
        />
      )}
    </div>
  );
}
