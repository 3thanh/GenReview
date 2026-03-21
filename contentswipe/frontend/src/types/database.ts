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
      content_queue: {
        Row: {
          business_id: string | null;
          content_type: Database["public"]["Enums"]["content_type"];
          created_at: string | null;
          description: string | null;
          feedback: string | null;
          id: string;
          metadata: Json | null;
          parent_id: string | null;
          script: string | null;
          status: Database["public"]["Enums"]["content_status"];
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
          variant_of: string | null;
          video_url: string | null;
        };
        Insert: {
          business_id?: string | null;
          content_type?: Database["public"]["Enums"]["content_type"];
          created_at?: string | null;
          description?: string | null;
          feedback?: string | null;
          id?: string;
          metadata?: Json | null;
          parent_id?: string | null;
          script?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
          variant_of?: string | null;
          video_url?: string | null;
        };
        Update: {
          business_id?: string | null;
          content_type?: Database["public"]["Enums"]["content_type"];
          created_at?: string | null;
          description?: string | null;
          feedback?: string | null;
          id?: string;
          metadata?: Json | null;
          parent_id?: string | null;
          script?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
          variant_of?: string | null;
          video_url?: string | null;
        };
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          completed_at: string | null;
          content_queue_id: string | null;
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
          content_queue_id?: string | null;
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
          content_queue_id?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      content_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_variant"
        | "needs_ideas";
      content_type: "video_script" | "linkedin_post" | "support_reply";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type ContentType = Database["public"]["Enums"]["content_type"];
export type ContentItem =
  Database["public"]["Tables"]["content_queue"]["Row"];
export type ContentInsert =
  Database["public"]["Tables"]["content_queue"]["Insert"];
export type GenerationJob =
  Database["public"]["Tables"]["generation_jobs"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];

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
    contentTypes: ["video_script", "linkedin_post", "support_reply"],
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
    contentTypes: ["video_script", "linkedin_post"],
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
    contentTypes: ["support_reply"],
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
    contentTypes: ["linkedin_post"],
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
