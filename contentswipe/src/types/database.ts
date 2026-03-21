export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          name: string
          description: string | null
          website_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          website_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          website_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          business_id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          id: string
          business_id: string | null
          session_id: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          channel: string | null
          review_mode: string | null
          source_type: string | null
          title: string
          body_text: string | null
          script: string | null
          image_url: string | null
          video_url: string | null
          thumbnail_url: string | null
          source_ref: string | null
          source_bundle: Json | null
          prompt_input_summary: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          review_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          starred: boolean
          down_arrow_designation: string | null
          generation_job_id: string | null
          generation_status: string | null
          model_name: string | null
          prompt_template_id: string | null
          parent_id: string | null
          variant_of: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_id?: string | null
          session_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          channel?: string | null
          review_mode?: string | null
          source_type?: string | null
          title: string
          body_text?: string | null
          script?: string | null
          image_url?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          source_ref?: string | null
          source_bundle?: Json | null
          prompt_input_summary?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          review_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          starred?: boolean
          down_arrow_designation?: string | null
          generation_job_id?: string | null
          generation_status?: string | null
          model_name?: string | null
          prompt_template_id?: string | null
          parent_id?: string | null
          variant_of?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string | null
          session_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          channel?: string | null
          review_mode?: string | null
          source_type?: string | null
          title?: string
          body_text?: string | null
          script?: string | null
          image_url?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          source_ref?: string | null
          source_bundle?: Json | null
          prompt_input_summary?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          review_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          starred?: boolean
          down_arrow_designation?: string | null
          generation_job_id?: string | null
          generation_status?: string | null
          model_name?: string | null
          prompt_template_id?: string | null
          parent_id?: string | null
          variant_of?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_variant_of_fkey"
            columns: ["variant_of"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          id: string
          content_item_id: string | null
          source_card_id: string | null
          job_type: string
          prompt: string
          status: string
          error_message: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          content_item_id?: string | null
          source_card_id?: string | null
          job_type: string
          prompt: string
          status?: string
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          content_item_id?: string | null
          source_card_id?: string | null
          job_type?: string
          prompt?: string
          status?: string
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_source_card_id_fkey"
            columns: ["source_card_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          id: string
          name: string
          content_type: Database["public"]["Enums"]["content_type"]
          template: string
          is_default: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          content_type?: Database["public"]["Enums"]["content_type"]
          template: string
          is_default?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          template?: string
          is_default?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      review_events: {
        Row: {
          id: string
          content_item_id: string
          action: string
          note: string | null
          actor_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          content_item_id: string
          action: string
          note?: string | null
          actor_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          content_item_id?: string
          action?: string
          note?: string | null
          actor_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_events_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      review_status: "pending" | "approved" | "rejected" | "needs_edit"
      content_type: "support" | "social" | "video"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ── Table row type aliases ──────────────────────────────────────

export type ReviewStatus = Database["public"]["Enums"]["review_status"]
export type ContentType = Database["public"]["Enums"]["content_type"]
export type ContentItem = Database["public"]["Tables"]["content_items"]["Row"]
export type ContentItemInsert = Database["public"]["Tables"]["content_items"]["Insert"]
export type Business = Database["public"]["Tables"]["businesses"]["Row"]
export type Session = Database["public"]["Tables"]["sessions"]["Row"]
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"]
export type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"]
export type PromptTemplate = Database["public"]["Tables"]["prompt_templates"]["Row"]
export type ReviewEvent = Database["public"]["Tables"]["review_events"]["Row"]
export type ReviewEventInsert = Database["public"]["Tables"]["review_events"]["Insert"]

// ── Feed types ──────────────────────────────────────────────────

export type SwipeDirection = "right" | "left" | "up" | "down"

export interface FeedOptions {
  businessId?: string
  sessionId?: string
  contentType?: ContentType
  limit?: number
  cursor?: string
  excludeIds?: string[]
}

export interface FeedPage {
  cards: ContentItem[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export interface CardWithRelations extends ContentItem {
  variants: ContentItem[]
  parent: ContentItem | null
  variantOf: ContentItem | null
  generationJob: GenerationJob | null
}

export interface SwipeAction {
  cardId: string
  direction: SwipeDirection
  feedback?: string
  previousStatus: ReviewStatus
  timestamp: number
}

export interface SessionStats {
  startedAt: number
  endedAt?: number
  totalSwiped: number
  approved: number
  rejected: number
  variantsRequested: number
  starred: number
  undoCount: number
  avgTimePerCardMs: number
  cardTimes: number[]
  personaId: string
  personaSwitchCount: number
}

export interface FeedStats {
  pending: number
  approved: number
  rejected: number
  needsEdit: number
  total: number
  approvalRate: number
  avgCardsPerDay: number
  oldestPendingAt: string | null
}

export interface FeedChangeEvent {
  type: "insert" | "update" | "delete"
  card: ContentItem
  oldReviewStatus?: ReviewStatus
}
