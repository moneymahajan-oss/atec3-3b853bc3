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
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["admin_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"] | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          type: Database["public"]["Enums"]["announcement_type"] | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          type?: Database["public"]["Enums"]["announcement_type"] | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"] | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          course_interest: string | null
          created_at: string
          email: string | null
          id: string
          is_read: boolean | null
          message: string | null
          name: string
          phone: string | null
        }
        Insert: {
          course_interest?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          course_interest?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          badge_label: string | null
          category: string
          created_at: string
          display_order: number | null
          duration: string | null
          fee: string | null
          full_description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          short_description: string | null
          syllabus: Json | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          category: string
          created_at?: string
          display_order?: number | null
          duration?: string | null
          fee?: string | null
          full_description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          short_description?: string | null
          syllabus?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          category?: string
          created_at?: string
          display_order?: number | null
          duration?: string | null
          fee?: string | null
          full_description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          short_description?: string | null
          syllabus?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          file_url: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          badge_text: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      stats: {
        Row: {
          created_at: string
          display_order: number | null
          icon_name: string | null
          id: string
          label: string
          value: number
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          label: string
          value?: number
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          label?: string
          value?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number | null
          id: string
          linkedin_url: string | null
          name: string
          photo_url: string | null
          role: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          role?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          role?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          batch_year: string | null
          course_name: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          photo_url: string | null
          rating: number | null
          review_text: string | null
          student_name: string
        }
        Insert: {
          batch_year?: string | null
          course_name?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          rating?: number | null
          review_text?: string | null
          student_name: string
        }
        Update: {
          batch_year?: string | null
          course_name?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          rating?: number | null
          review_text?: string | null
          student_name?: string
        }
        Relationships: []
      }
      youtube_videos: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          thumbnail_url: string | null
          title: string
          video_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title: string
          video_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "editor"
      announcement_type: "badge" | "news" | "urgent"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super_admin", "editor"],
      announcement_type: ["badge", "news", "urgent"],
    },
  },
} as const
