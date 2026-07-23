export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          brand: string;
          brand_id: string | null;
          brands: string[];
          price: number;
          old_price: number | null;
          category_id: string;
          description: string | null;
          is_new: boolean;
          is_active: boolean;
          is_featured: boolean;
          sort_order: number;
          image_padding: string | null;
          auto_trim: boolean;
          image_margin: number;
          image_scale: number;
          image_offset_x: number;
          image_offset_y: number;
          image_mode: string;
          out_of_stock_message: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sizes: {
        Row: {
          id: string;
          label: string;
          sort_order: number;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      product_sizes: {
        Row: {
          product_id: string;
          size_id: string;
          stock: number;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          path: string | null;
          alt_text: string | null;
          is_primary: boolean;
          sort_order: number;
          image_mode: string | null;
          image_scale: number | null;
          image_offset_x: number | null;
          image_offset_y: number | null;
          image_padding: number | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      store_settings: {
        Row: {
          id: string;
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      admins: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          admin_id: string | null;
          admin_email: string;
          action: string;
          entity: string;
          entity_id: string | null;
          entity_name: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          event_type: string;
          session_id: string | null;
          product_id: string | null;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      video_drops: {
        Row: {
          id: string;
          title: string;
          thumbnail_url: string | null;
          video_url: string | null;
          original_url: string | null;
          youtube_url: string | null;
          is_new: boolean;
          is_active: boolean;
          clicks: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
  };
};
