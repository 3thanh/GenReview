export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          website_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          business_id: string | null;
          session_id: string | null;
          content_type: Database["public"]["Enums"]["content_type"];
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
          review_status: Database["public"]["Enums"]["review_status"];
          review_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          starred: boolean;
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
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          session_id?: string | null;
          content_type?: Database["public"]["Enums"]["content_type"];
          channel?: string | null;
          review_mode?: string | null;
          source_type?: string | null;
          title: string;
          body_text?: string | null;
          script?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          thumbnail_url?: string | null;
          source_ref?: string | null;
          source_bundle?: Json | null;
          prompt_input_summary?: string | null;
          review_status?: Database["public"]["Enums"]["review_status"];
          review_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          starred?: boolean;
          down_arrow_designation?: string | null;
          generation_job_id?: string | null;
          generation_status?: string | null;
          model_name?: string | null;
          prompt_template_id?: string | null;
          parent_id?: string | null;
          variant_of?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          session_id?: string | null;
          content_type?: Database["public"]["Enums"]["content_type"];
          channel?: string | null;
          review_mode?: string | null;
          source_type?: string | null;
          title?: string;
          body_text?: string | null;
          script?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          thumbnail_url?: string | null;
          source_ref?: string | null;
          source_bundle?: Json | null;
          prompt_input_summary?: string | null;
          review_status?: Database["public"]["Enums"]["review_status"];
          review_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          starred?: boolean;
          down_arrow_designation?: string | null;
          generation_job_id?: string | null;
          generation_status?: string | null;
          model_name?: string | null;
          prompt_template_id?: string | null;
          parent_id?: string | null;
          variant_of?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          completed_at: string | null;
          content_item_id: string | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          job_type: string;
          prompt: string;
          source_card_id: string | null;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          content_item_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          job_type: string;
          prompt: string;
          source_card_id?: string | null;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          content_item_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          job_type?: string;
          prompt?: string;
          source_card_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      prompt_templates: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"];
          created_at: string | null;
          id: string;
          is_default: boolean | null;
          name: string;
          template: string;
        };
        Insert: {
          content_type?: Database["public"]["Enums"]["content_type"];
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          name: string;
          template: string;
        };
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"];
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          template?: string;
        };
        Relationships: [];
      };
      review_events: {
        Row: {
          id: string;
          content_item_id: string;
          action: string;
          note: string | null;
          actor_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          action: string;
          note?: string | null;
          actor_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          content_item_id?: string;
          action?: string;
          note?: string | null;
          actor_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      review_status: "pending" | "approved" | "rejected" | "needs_edit";
      content_type: "support" | "social" | "video";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ReviewStatus = Database["public"]["Enums"]["review_status"];
export type ContentType = Database["public"]["Enums"]["content_type"];
export type ContentItem = Database["public"]["Tables"]["content_items"]["Row"];
export type ContentItemInsert = Database["public"]["Tables"]["content_items"]["Insert"];
export type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];

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
    contentTypes: ["support", "social", "video"],
    swipeLabels: {
      right: { action: "Approve", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Reject", shortcut: "←", color: "#ef4444", requiresFeedback: true },
      up: { action: "Request Variant", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "Send for Review", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
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
      down: { action: "Send for Review", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
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
      up: { action: "Escalate", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "Send for Review", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "Inbox zero — no tickets to review",
    emptyStateCta: "Check back later",
  },
  {
    id: "social-manager",
    name: "Social Manager",
    description: "Review and schedule social content",
    icon: "share",
    contentTypes: ["social"],
    swipeLabels: {
      right: { action: "Schedule", shortcut: "→", color: "#22c55e", requiresFeedback: false },
      left: { action: "Skip", shortcut: "←", color: "#ef4444", requiresFeedback: false },
      up: { action: "Edit & Rewrite", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
      down: { action: "Send for Review", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
    },
    emptyStateMessage: "No posts to review",
    emptyStateCta: "Draft a new post",
  },
];
