import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Headphones, Bot, User, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import type { ContentItem } from "../types/database";

export interface ConversationMessage {
  role: "customer" | "bot" | "agent";
  text: string;
  timestamp?: string;
  status?: "sent" | "failed" | "draft";
  sender_name?: string;
}

export interface ConversationData {
  id?: string;
  customer?: { name: string; email?: string; avatar_url?: string };
  messages: ConversationMessage[];
  channel?: string;
  ai_confidence?: number;
  ticket_ref?: string;
}

export interface SupportCardHandle {
  scrollChat: (direction: "up" | "down") => void;
}

interface SupportCardProps {
  card: ContentItem;
}

function formatTime(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getConversation(card: ContentItem): ConversationData | null {
  const meta = card.metadata as Record<string, any> | null;
  if (!meta?.conversation) {
    const bundle = card.source_bundle as Record<string, any> | null;
    if (bundle?.conversation) return bundle.conversation as ConversationData;
    return null;
  }
  return meta.conversation as ConversationData;
}

function ConfidenceBadge({ value }: { value: number }) {
  const level = value >= 0.8 ? "high" : value >= 0.5 ? "medium" : "low";
  const colors = {
    high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    low: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  const labels = { high: "High confidence", medium: "Medium", low: "Low confidence" };

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors[level]}`}>
      {labels[level]}
    </span>
  );
}

export const SupportCard = forwardRef<SupportCardHandle, SupportCardProps>(
  function SupportCard({ card }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const conversation = getConversation(card);
    const customer = conversation?.customer;
    const messages = conversation?.messages ?? [];
    const draftReply = card.body_text;
    const sourceRef = card.source_ref;
    const channel = card.channel ?? conversation?.channel ?? "intercom";

    const scrollConversation = (direction: "up" | "down") => {
      if (!scrollRef.current) return;
      const delta = direction === "down" ? 120 : -120;
      scrollRef.current.scrollBy({ top: delta, behavior: "smooth" });
    };

    useImperativeHandle(ref, () => ({
      scrollChat(direction: "up" | "down") {
        scrollConversation(direction);
      },
    }));

    const updateScrollState = () => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollUp(el.scrollTop > 4);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
      updateScrollState();
    }, [messages.length]);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.addEventListener("scroll", updateScrollState, { passive: true });
      updateScrollState();
      return () => el.removeEventListener("scroll", updateScrollState);
    }, []);

    const hasThread = messages.length > 0;

    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-zinc-200">
                  {customer?.name ?? "Customer"}
                </span>
                {conversation?.ai_confidence != null && (
                  <ConfidenceBadge value={conversation.ai_confidence} />
                )}
              </div>
              <span className="text-[11px] text-zinc-500 capitalize">{channel}</span>
            </div>
          </div>
          {sourceRef && (
            <span className="text-[11px] text-zinc-600 font-mono">#{sourceRef}</span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col pr-1">
          {hasThread ? (
            <div className="relative mb-4 min-h-0 flex-1">
              {canScrollUp && (
                <button
                  type="button"
                  onClick={() => scrollConversation("up")}
                  className="absolute left-0 right-0 top-0 z-10 flex h-8 items-start justify-center bg-gradient-to-b from-zinc-900 to-transparent pt-0.5 text-zinc-500 transition hover:text-zinc-300"
                  aria-label="Scroll conversation up"
                >
                  <ChevronUp className="h-3.5 w-3.5 animate-pulse" />
                </button>
              )}

              <div
                ref={scrollRef}
                className="scrollbar-hide h-full min-h-[260px] max-h-[min(56vh,760px)] space-y-3 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "none" }}
              >
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} customerName={customer?.name} />
                ))}
              </div>

              {canScrollDown && (
                <button
                  type="button"
                  onClick={() => scrollConversation("down")}
                  className="absolute bottom-0 left-0 right-0 z-10 flex h-8 items-end justify-center bg-gradient-to-t from-zinc-900 to-transparent pb-0.5 text-zinc-500 transition hover:text-zinc-300"
                  aria-label="Scroll conversation down"
                >
                  <ChevronDown className="h-3.5 w-3.5 animate-pulse" />
                </button>
              )}
            </div>
          ) : (
            (card.image_url || card.thumbnail_url) && (
              <div className="rounded-xl overflow-hidden border border-zinc-700/30 mb-3">
                <img
                  src={card.image_url ?? card.thumbnail_url!}
                  alt="Support context"
                  className="w-full object-cover max-h-48"
                />
              </div>
            )
          )}

          {draftReply && (
            <div className="relative rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 lg:p-5">
              <div className="mb-3 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400/80 font-semibold uppercase tracking-wider">
                  AI Draft — Review & Send
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-8 text-zinc-200 lg:text-[15px]">
                {draftReply}
              </p>
            </div>
          )}

          {hasThread && (
            <div className="flex items-center justify-center gap-1 mt-2.5">
              <span className="text-[10px] text-zinc-600">↑ ↓ scroll conversation</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

function MessageBubble({
  message,
  customerName,
}: {
  message: ConversationMessage;
  customerName?: string;
}) {
  const isCustomer = message.role === "customer";
  const isFailed = message.status === "failed";

  return (
    <div className={`flex gap-2 ${isCustomer ? "justify-start" : "justify-end"}`}>
      {isCustomer && (
        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3 h-3 text-zinc-400" />
        </div>
      )}

      <div className={`max-w-[80%] ${isCustomer ? "" : "order-first"}`}>
        <div className={`flex items-center gap-1.5 mb-0.5 ${isCustomer ? "" : "justify-end"}`}>
          <span className="text-[10px] text-zinc-500">
            {message.sender_name ?? (isCustomer ? customerName ?? "Customer" : "Fin AI")}
          </span>
          {message.timestamp && (
            <span className="text-[10px] text-zinc-600">{formatTime(message.timestamp)}</span>
          )}
        </div>

        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isCustomer
              ? "bg-zinc-800 text-zinc-200 rounded-tl-md"
              : isFailed
                ? "bg-red-500/10 text-red-300 border border-red-500/20 rounded-tr-md"
                : "bg-blue-600/20 text-blue-100 border border-blue-500/15 rounded-tr-md"
          }`}
        >
          {isFailed && (
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">Could not resolve</span>
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>

      {!isCustomer && (
        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3 h-3 text-blue-400" />
        </div>
      )}
    </div>
  );
}
