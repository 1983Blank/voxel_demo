/**
 * Supabase Database Types
 *
 * These types match the database schema in Supabase.
 * Run the SQL below in Supabase SQL Editor to create the tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      screens: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          file_name: string;
          file_path: string | null;
          html: string | null;
          thumbnail: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          file_name: string;
          file_path?: string | null;
          html?: string | null;
          thumbnail?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          file_name?: string;
          file_path?: string | null;
          html?: string | null;
          thumbnail?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      screen_versions: {
        Row: {
          id: string;
          screen_id: string;
          html: string;
          prompt: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          screen_id: string;
          html: string;
          prompt?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          screen_id?: string;
          html?: string;
          prompt?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      components: {
        Row: {
          id: string;
          user_id: string;
          screen_id: string | null;
          name: string;
          html: string;
          css: string | null;
          category: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          screen_id?: string | null;
          name: string;
          html: string;
          css?: string | null;
          category?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          screen_id?: string | null;
          name?: string;
          html?: string;
          css?: string | null;
          category?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
      };
      prototypes: {
        Row: {
          id: string;
          user_id: string;
          screen_id: string;
          name: string;
          html: string;
          is_published: boolean;
          share_id: string | null;
          allow_comments: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          screen_id: string;
          name: string;
          html: string;
          is_published?: boolean;
          share_id?: string | null;
          allow_comments?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          screen_id?: string;
          name?: string;
          html?: string;
          is_published?: boolean;
          share_id?: string | null;
          allow_comments?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      variants: {
        Row: {
          id: string;
          prototype_id: string;
          name: string;
          label: string;
          html: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          prototype_id: string;
          name: string;
          label: string;
          html: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          prototype_id?: string;
          name?: string;
          label?: string;
          html?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          prototype_id: string;
          variant_id: string | null;
          user_id: string;
          user_name: string;
          user_avatar: string | null;
          content: string;
          position_x: number | null;
          position_y: number | null;
          parent_id: string | null;
          resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          prototype_id: string;
          variant_id?: string | null;
          user_id: string;
          user_name: string;
          user_avatar?: string | null;
          content: string;
          position_x?: number | null;
          position_y?: number | null;
          parent_id?: string | null;
          resolved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          prototype_id?: string;
          variant_id?: string | null;
          user_id?: string;
          user_name?: string;
          user_avatar?: string | null;
          content?: string;
          position_x?: number | null;
          position_y?: number | null;
          parent_id?: string | null;
          resolved?: boolean;
          created_at?: string;
        };
      };
      product_contexts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: string;
          content?: string;
          created_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          prototype_id: string;
          variant_id: string | null;
          event_type: string;
          user_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prototype_id: string;
          variant_id?: string | null;
          event_type: string;
          user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prototype_id?: string;
          variant_id?: string | null;
          event_type?: string;
          user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Screen = Database['public']['Tables']['screens']['Row'];
export type ScreenInsert = Database['public']['Tables']['screens']['Insert'];
export type ScreenUpdate = Database['public']['Tables']['screens']['Update'];

export type ScreenVersion = Database['public']['Tables']['screen_versions']['Row'];
export type ScreenVersionInsert = Database['public']['Tables']['screen_versions']['Insert'];

export type Component = Database['public']['Tables']['components']['Row'];
export type ComponentInsert = Database['public']['Tables']['components']['Insert'];

export type Prototype = Database['public']['Tables']['prototypes']['Row'];
export type PrototypeInsert = Database['public']['Tables']['prototypes']['Insert'];

export type Variant = Database['public']['Tables']['variants']['Row'];
export type VariantInsert = Database['public']['Tables']['variants']['Insert'];

export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export type ProductContext = Database['public']['Tables']['product_contexts']['Row'];
export type ProductContextInsert = Database['public']['Tables']['product_contexts']['Insert'];

export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert'];
