export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      game_moves: {
        Row: {
          action: Json
          created_at: string
          id: string
          idx: number
          session_id: string
          user_id: string
        }
        Insert: {
          action: Json
          created_at?: string
          id?: string
          idx: number
          session_id: string
          user_id: string
        }
        Update: {
          action?: Json
          created_at?: string
          id?: string
          idx?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          game_key: string
          id: string
          move_count: number
          players: string[]
          proposed_by: string | null
          room_id: string
          scores: Json
          state: Json
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          game_key: string
          id?: string
          move_count?: number
          players?: string[]
          proposed_by?: string | null
          room_id: string
          scores?: Json
          state?: Json
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          game_key?: string
          id?: string
          move_count?: number
          players?: string[]
          proposed_by?: string | null
          room_id?: string
          scores?: Json
          state?: Json
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_key_fkey"
            columns: ["game_key"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "game_sessions_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          active: boolean
          key: string
          name: string
          sort_order: number
          tagline: string | null
        }
        Insert: {
          active?: boolean
          key: string
          name: string
          sort_order?: number
          tagline?: string | null
        }
        Update: {
          active?: boolean
          key?: string
          name?: string
          sort_order?: number
          tagline?: string | null
        }
        Relationships: []
      }
      guess_me_questions: {
        Row: {
          active: boolean
          category: string
          id: string
          options: string[]
          prompt: string
        }
        Insert: {
          active?: boolean
          category: string
          id?: string
          options: string[]
          prompt: string
        }
        Update: {
          active?: boolean
          category?: string
          id?: string
          options?: string[]
          prompt?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          room_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          pair_id: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          pair_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          pair_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pair_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_invites_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_members: {
        Row: {
          active: boolean
          joined_at: string
          pair_id: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          joined_at?: string
          pair_id: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          joined_at?: string
          pair_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_members_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_stats: {
        Row: {
          games_played: Json
          last_played_on: string | null
          nights_played: number
          pair_id: string
          streak: number
          total_seconds: number
          updated_at: string
        }
        Insert: {
          games_played?: Json
          last_played_on?: string | null
          nights_played?: number
          pair_id: string
          streak?: number
          total_seconds?: number
          updated_at?: string
        }
        Update: {
          games_played?: Json
          last_played_on?: string | null
          nights_played?: number
          pair_id?: string
          streak?: number
          total_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_stats_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      pairs: {
        Row: {
          anniversary: string | null
          created_at: string
          id: string
          status: string
          unpaired_at: string | null
        }
        Insert: {
          anniversary?: string | null
          created_at?: string
          id?: string
          status?: string
          unpaired_at?: string | null
        }
        Update: {
          anniversary?: string | null
          created_at?: string
          id?: string
          status?: string
          unpaired_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deletion_scheduled_at: string | null
          display_name: string | null
          id: string
          last_seen_at: string | null
          timezone: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deletion_scheduled_at?: string | null
          display_name?: string | null
          id: string
          last_seen_at?: string | null
          timezone?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deletion_scheduled_at?: string | null
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          timezone?: string
          username?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          host_id: string | null
          id: string
          pair_id: string
          theme: string
        }
        Insert: {
          created_at?: string
          host_id?: string | null
          id?: string
          pair_id: string
          theme?: string
        }
        Update: {
          created_at?: string
          host_id?: string | null
          id?: string
          pair_id?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pairs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_pair_member: {
        Args: { _pair_id: string; _user_id: string }
        Returns: boolean
      }
      my_pair_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
