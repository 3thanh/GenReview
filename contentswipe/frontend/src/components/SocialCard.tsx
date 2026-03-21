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
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
          <ChannelIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {channelLabel} Post
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold leading-tight text-slate-900">
        {card.title}
      </h2>

      {card.body_text && (
        <div className="surface-muted mb-4 rounded-[24px] p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {card.body_text}
          </p>
        </div>
      )}

      {(card.image_url || card.thumbnail_url) && (
        <img
          src={card.image_url ?? card.thumbnail_url!}
          alt=""
          className="w-full rounded-[24px] border border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]"
        />
      )}
    </div>
  );
}
