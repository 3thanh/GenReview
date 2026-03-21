export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContentType = "video" | "social" | "support";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_edit";

export interface ContentItem {
  id: string;
  business_id: string | null;
  session_id: string | null;
  content_type: ContentType;
  channel: string | null;
  review_mode: string | null;
  source_type: string | null;
  title: string;
  body_text: string | null;
  script: string | null;
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  source_ref: string | null;
  source_bundle: Json | null;
  prompt_input_summary: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  starred: boolean | null;
  down_arrow_designation: string | null;
  generation_job_id: string | null;
  generation_status: string | null;
  model_name: string | null;
  prompt_template_id: string | null;
  parent_id: string | null;
  variant_of: string | null;
  metadata: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GenerationJob {
  id: string;
  content_item_id: string | null;
  source_card_id: string | null;
  job_type: string;
  prompt: string;
  status: string;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface Business {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  created_at: string | null;
}

export type SwipeDirection = "right" | "left" | "up" | "down";

export interface SwipeLabel {
  action: string;
  shortcut: string;
  color: string;
  requiresFeedback: boolean;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  contentTypes: ContentType[];
  swipeLabels: Record<SwipeDirection, SwipeLabel>;
  emptyStateMessage: string;
  emptyStateCta: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "all",
    name: "Everything",
    description: "All content types in a single feed",
    icon: "layers",
    contentTypes: ["video", "social", "support"],
    swipeLabels: {
      right: { action: "Approve", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Reject", shortcut: "←", color: "#ef4444", requiresFeedback: true },
      up: { action: "Request Variant", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "More Ideas", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "Nothing to review right now",
    emptyStateCta: "Create something new",
  },
  {
    id: "content-creator",
    name: "Content Creator",
    description: "Review AI-generated video scripts and social posts",
    icon: "video",
    contentTypes: ["video", "social"],
    swipeLabels: {
      right: { action: "Approve", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Reject", shortcut: "←", color: "#ef4444", requiresFeedback: true },
      up: { action: "Request Variant", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "More Ideas", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "No content to review",
    emptyStateCta: "Create your first video",
  },
  {
    id: "support-agent",
    name: "Support Agent",
    description: "Triage and respond to support tickets",
    icon: "headset",
    contentTypes: ["support"],
    swipeLabels: {
      right: { action: "Send Reply", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Discard", shortcut: "←", color: "#ef4444", requiresFeedback: true },
      up: { action: "Escalate", shortcut: "↑", color: "#f59e0b", requiresFeedback: true },
      down: { action: "Use Template", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "Inbox zero — no tickets to review",
    emptyStateCta: "Check back later",
  },
  {
    id: "social-manager",
    name: "Social Manager",
    description: "Review and schedule LinkedIn posts",
    icon: "share",
    contentTypes: ["social"],
    swipeLabels: {
      right: { action: "Schedule", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Skip", shortcut: "←", color: "#ef4444", requiresFeedback: false },
      up: { action: "Edit & Rewrite", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "Generate Alternatives", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "No posts to review",
    emptyStateCta: "Draft a new post",
  },
];
