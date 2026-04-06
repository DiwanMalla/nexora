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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          preferred_model: string | null;
          tier: "free" | "pro" | "teams" | "api";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status:
            | "active"
            | "inactive"
            | "past_due"
            | "canceled"
            | null;
          daily_message_count: number;
          daily_agent_count: number;
          last_usage_reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_model?: string | null;
          tier?: "free" | "pro" | "teams" | "api";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?:
            | "active"
            | "inactive"
            | "past_due"
            | "canceled"
            | null;
          daily_message_count?: number;
          daily_agent_count?: number;
          last_usage_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_model?: string | null;
          tier?: "free" | "pro" | "teams" | "api";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?:
            | "active"
            | "inactive"
            | "past_due"
            | "canceled"
            | null;
          daily_message_count?: number;
          daily_agent_count?: number;
          last_usage_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          model: string | null;
          agent_type: string | null;
          is_comparison: boolean;
          pinned: boolean;
          archived: boolean;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          model?: string | null;
          agent_type?: string | null;
          is_comparison?: boolean;
          pinned?: boolean;
          archived?: boolean;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          model?: string | null;
          agent_type?: string | null;
          is_comparison?: boolean;
          pinned?: boolean;
          archived?: boolean;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string;
          model: string | null;
          citations: Json | null;
          execution_blocks: Json | null;
          token_usage: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string;
          model?: string | null;
          citations?: Json | null;
          execution_blocks?: Json | null;
          token_usage?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: "user" | "assistant" | "system" | "tool";
          content?: string;
          model?: string | null;
          citations?: Json | null;
          execution_blocks?: Json | null;
          token_usage?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          message_id: string | null;
          storage_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          status: "uploaded" | "processing" | "ready" | "error";
          extracted_text: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          storage_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          status?: "uploaded" | "processing" | "ready" | "error";
          extracted_text?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string | null;
          message_id?: string | null;
          storage_path?: string;
          original_name?: string;
          mime_type?: string;
          size_bytes?: number;
          status?: "uploaded" | "processing" | "ready" | "error";
          extracted_text?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
