export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContentType = "video" | "social" | "support";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_edit";
export type SwipeDirection = "right" | "left" | "up" | "down";

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

export interface ContentItemInsert {
  id?: string;
  business_id?: string | null;
  session_id?: string | null;
  content_type?: ContentType;
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
  review_status?: ReviewStatus;
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
}

export type ContentItemUpdate = Partial<ContentItemInsert>;

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

export interface GenerationJobInsert {
  id?: string;
  content_item_id?: string | null;
  source_card_id?: string | null;
  job_type: string;
  prompt: string;
  status?: string;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export type GenerationJobUpdate = Partial<GenerationJobInsert>;

export interface Business {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  created_at: string | null;
}

export interface BusinessInsert {
  id?: string;
  name: string;
  description?: string | null;
  website_url?: string | null;
  created_at?: string | null;
}

export type BusinessUpdate = Partial<BusinessInsert>;

export interface Session {
  id: string;
  business_id: string;
  name: string;
  created_at: string | null;
}

export interface SessionInsert {
  id?: string;
  business_id: string;
  name: string;
  created_at?: string | null;
}

export type SessionUpdate = Partial<SessionInsert>;

export interface ReviewAction {
  action: string;
  shortcut: string;
  color: string;
  requiresFeedback: boolean;
}

export const REVIEW_ACTIONS: Record<SwipeDirection, ReviewAction> = {
  right: { action: "Approve", shortcut: "→", color: "#22c55e", requiresFeedback: false },
  left: { action: "Reject", shortcut: "←", color: "#ef4444", requiresFeedback: true },
  up: { action: "Request Variant", shortcut: "↑", color: "#a855f7", requiresFeedback: true },
  down: { action: "More Ideas", shortcut: "↓", color: "#3b82f6", requiresFeedback: true },
};

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: BusinessInsert;
        Update: BusinessUpdate;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: SessionUpdate;
        Relationships: [];
      };
      content_items: {
        Row: ContentItem;
        Insert: ContentItemInsert;
        Update: ContentItemUpdate;
        Relationships: [];
      };
      generation_jobs: {
        Row: GenerationJob;
        Insert: GenerationJobInsert;
        Update: GenerationJobUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      content_type: ContentType;
      review_status: ReviewStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
