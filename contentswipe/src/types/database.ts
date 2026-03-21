export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      content_queue: {
        Row: {
          business_id: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          description: string | null
          feedback: string | null
          id: string
          metadata: Json | null
          parent_id: string | null
          script: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          variant_of: string | null
          video_url: string | null
        }
        Insert: {
          business_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          variant_of?: string | null
          video_url?: string | null
        }
        Update: {
          business_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          variant_of?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_queue_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_queue_variant_of_fkey"
            columns: ["variant_of"]
            isOneToOne: false
            referencedRelation: "content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          content_queue_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          prompt: string
          source_card_id: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          content_queue_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          prompt: string
          source_card_id?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          content_queue_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          prompt?: string
          source_card_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_content_queue_id_fkey"
            columns: ["content_queue_id"]
            isOneToOne: false
            referencedRelation: "content_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_source_card_id_fkey"
            columns: ["source_card_id"]
            isOneToOne: false
            referencedRelation: "content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          template: string
        }
        Insert: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          template: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          template?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      content_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_variant"
        | "needs_ideas"
      content_type: "video_script" | "linkedin_post" | "support_reply"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type ContentStatus = Database["public"]["Enums"]["content_status"]
export type ContentType = Database["public"]["Enums"]["content_type"]
export type ContentItem = Database["public"]["Tables"]["content_queue"]["Row"]
export type ContentInsert = Database["public"]["Tables"]["content_queue"]["Insert"]
export type Business = Database["public"]["Tables"]["businesses"]["Row"]
export type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"]
export type PromptTemplate = Database["public"]["Tables"]["prompt_templates"]["Row"]

// ── Feed types ──────────────────────────────────────────────────

export type SwipeDirection = "right" | "left" | "up" | "down"

export interface FeedOptions {
  businessId?: string
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
  previousStatus: ContentStatus
  timestamp: number
}

export interface SessionStats {
  startedAt: number
  endedAt?: number
  totalSwiped: number
  approved: number
  rejected: number
  variantsRequested: number
  ideasRequested: number
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
  needsVariant: number
  needsIdeas: number
  total: number
  approvalRate: number
  avgCardsPerDay: number
  oldestPendingAt: string | null
}

export interface FeedChangeEvent {
  type: "insert" | "update" | "delete"
  card: ContentItem
  oldStatus?: ContentStatus
}
