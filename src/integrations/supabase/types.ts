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
      ai_use_cases: {
        Row: {
          created_at: string
          description: string | null
          earning_potential: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          earning_potential?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          earning_potential?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
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
          brochure_pdf_url: string | null
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
          syllabus_pdf_url: string | null
          thumbnail_url: string | null
          updated_at: string
          whatsapp_template_key: string | null
        }
        Insert: {
          badge_label?: string | null
          brochure_pdf_url?: string | null
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
          syllabus_pdf_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          whatsapp_template_key?: string | null
        }
        Update: {
          badge_label?: string | null
          brochure_pdf_url?: string | null
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
          syllabus_pdf_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          whatsapp_template_key?: string | null
        }
        Relationships: []
      }
      crm_audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crm_courses: {
        Row: {
          brochure_url: string | null
          category: Database["public"]["Enums"]["crm_course_category"]
          certificate_title: string | null
          concise_syllabus: string | null
          created_at: string
          detailed_syllabus_html: string | null
          display_order: number
          duration: string | null
          emi_options: Json
          id: string
          instagram_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          mode: Database["public"]["Enums"]["crm_course_mode"]
          name: string
          next_batch_date: string | null
          og_image_url: string | null
          registration_fee: number
          slug: string | null
          total_fee: number
          updated_at: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          brochure_url?: string | null
          category: Database["public"]["Enums"]["crm_course_category"]
          certificate_title?: string | null
          concise_syllabus?: string | null
          created_at?: string
          detailed_syllabus_html?: string | null
          display_order?: number
          duration?: string | null
          emi_options?: Json
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          mode?: Database["public"]["Enums"]["crm_course_mode"]
          name: string
          next_batch_date?: string | null
          og_image_url?: string | null
          registration_fee?: number
          slug?: string | null
          total_fee?: number
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          brochure_url?: string | null
          category?: Database["public"]["Enums"]["crm_course_category"]
          certificate_title?: string | null
          concise_syllabus?: string | null
          created_at?: string
          detailed_syllabus_html?: string | null
          display_order?: number
          duration?: string | null
          emi_options?: Json
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          mode?: Database["public"]["Enums"]["crm_course_mode"]
          name?: string
          next_batch_date?: string | null
          og_image_url?: string | null
          registration_fee?: number
          slug?: string | null
          total_fee?: number
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      crm_enquiries: {
        Row: {
          alt_phone: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          converted_student_id: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          email: string | null
          follow_up_date: string | null
          id: string
          lost_reason: string | null
          name: string
          notes: string | null
          phone: string
          priority: Database["public"]["Enums"]["crm_enquiry_priority"]
          source: Database["public"]["Enums"]["crm_enquiry_source"]
          status: Database["public"]["Enums"]["crm_enquiry_status"]
          updated_at: string
        }
        Insert: {
          alt_phone?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          converted_student_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string | null
          phone: string
          priority?: Database["public"]["Enums"]["crm_enquiry_priority"]
          source?: Database["public"]["Enums"]["crm_enquiry_source"]
          status?: Database["public"]["Enums"]["crm_enquiry_status"]
          updated_at?: string
        }
        Update: {
          alt_phone?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          converted_student_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string | null
          phone?: string
          priority?: Database["public"]["Enums"]["crm_enquiry_priority"]
          source?: Database["public"]["Enums"]["crm_enquiry_source"]
          status?: Database["public"]["Enums"]["crm_enquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_enquiries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "crm_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_enquiry_notes: {
        Row: {
          body: string
          created_at: string
          enquiry_id: string
          id: string
          note_type: string
          staff_id: string | null
          staff_name: string | null
        }
        Insert: {
          body: string
          created_at?: string
          enquiry_id: string
          id?: string
          note_type?: string
          staff_id?: string | null
          staff_name?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          enquiry_id?: string
          id?: string
          note_type?: string
          staff_id?: string | null
          staff_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_enquiry_notes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "crm_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_institute_settings: {
        Row: {
          address: string | null
          certificate_template_computer: string | null
          certificate_template_finance: string | null
          collection_timings: string | null
          created_at: string
          director_signature_url: string | null
          email: string | null
          fee_reminder_days: number
          gst: string | null
          id: string
          institute_seal_url: string | null
          is_singleton: boolean
          logo_url: string | null
          name: string
          phone: string | null
          receipt_footer: string | null
          receipt_header: string | null
          referral_reward: number
          updated_at: string
          upi_id: string | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          certificate_template_computer?: string | null
          certificate_template_finance?: string | null
          collection_timings?: string | null
          created_at?: string
          director_signature_url?: string | null
          email?: string | null
          fee_reminder_days?: number
          gst?: string | null
          id?: string
          institute_seal_url?: string | null
          is_singleton?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          referral_reward?: number
          updated_at?: string
          upi_id?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          certificate_template_computer?: string | null
          certificate_template_finance?: string | null
          collection_timings?: string | null
          created_at?: string
          director_signature_url?: string | null
          email?: string | null
          fee_reminder_days?: number
          gst?: string | null
          id?: string
          institute_seal_url?: string | null
          is_singleton?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          referral_reward?: number
          updated_at?: string
          upi_id?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      crm_students: {
        Row: {
          address: string | null
          alt_phone: string | null
          batch_id: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          email: string | null
          enrolment_date: string
          enrolment_no: string | null
          full_name: string
          gender: Database["public"]["Enums"]["crm_student_gender"] | null
          id: string
          id_proof_url: string | null
          notes: string | null
          phone: string
          photo_url: string | null
          registration_fee_paid: number
          source_enquiry_id: string | null
          status: Database["public"]["Enums"]["crm_student_status"]
          total_fee: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          batch_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          enrolment_date?: string
          enrolment_no?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["crm_student_gender"] | null
          id?: string
          id_proof_url?: string | null
          notes?: string | null
          phone: string
          photo_url?: string | null
          registration_fee_paid?: number
          source_enquiry_id?: string | null
          status?: Database["public"]["Enums"]["crm_student_status"]
          total_fee?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          batch_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          enrolment_date?: string
          enrolment_no?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["crm_student_gender"] | null
          id?: string
          id_proof_url?: string | null
          notes?: string | null
          phone?: string
          photo_url?: string | null
          registration_fee_paid?: number
          source_enquiry_id?: string | null
          status?: Database["public"]["Enums"]["crm_student_status"]
          total_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "crm_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_students_source_enquiry_id_fkey"
            columns: ["source_enquiry_id"]
            isOneToOne: false
            referencedRelation: "crm_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_user_roles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["crm_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["crm_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["crm_role"]
          user_id?: string
        }
        Relationships: []
      }
      crm_whatsapp_logs: {
        Row: {
          contact_name: string | null
          contact_number: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message_snapshot: string
          sent_at: string | null
          staff_id: string | null
          staff_name: string | null
          status: Database["public"]["Enums"]["crm_wa_log_status"]
          template_key: string
        }
        Insert: {
          contact_name?: string | null
          contact_number: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_snapshot: string
          sent_at?: string | null
          staff_id?: string | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["crm_wa_log_status"]
          template_key: string
        }
        Update: {
          contact_name?: string | null
          contact_number?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message_snapshot?: string
          sent_at?: string | null
          staff_id?: string | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["crm_wa_log_status"]
          template_key?: string
        }
        Relationships: []
      }
      crm_whatsapp_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template_key?: string
          updated_at?: string
          variables?: Json
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
      leads: {
        Row: {
          course_name: string | null
          created_at: string
          email: string | null
          id: string
          is_read: boolean | null
          message: string | null
          phone: string | null
          source: string
          student_name: string | null
        }
        Insert: {
          course_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          phone?: string | null
          source?: string
          student_name?: string | null
        }
        Update: {
          course_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          phone?: string | null
          source?: string
          student_name?: string | null
        }
        Relationships: []
      }
      mock_test_results: {
        Row: {
          answers: Json | null
          course: string
          id: string
          score: number | null
          student_name: string
          taken_at: string
          total: number | null
          whatsapp_no: string
        }
        Insert: {
          answers?: Json | null
          course: string
          id?: string
          score?: number | null
          student_name: string
          taken_at?: string
          total?: number | null
          whatsapp_no: string
        }
        Update: {
          answers?: Json | null
          course?: string
          id?: string
          score?: number | null
          student_name?: string
          taken_at?: string
          total?: number | null
          whatsapp_no?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
          course: string
          created_at: string
          id: string
          is_active: boolean | null
          questions: Json
          title: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          questions?: Json
          title: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          questions?: Json
          title?: string
        }
        Relationships: []
      }
      offer_belt: {
        Row: {
          bg_color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          sort_order: number | null
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          sort_order?: number | null
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          sort_order?: number | null
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
          youtube_url: string | null
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
          youtube_url?: string | null
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
          youtube_url?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          message_body: string
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_body: string
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_body?: string
          name?: string
          template_key?: string
          updated_at?: string
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
          section: string | null
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
          section?: string | null
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
          section?: string | null
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
      has_any_crm_role: { Args: { _user_id: string }; Returns: boolean }
      has_crm_role: {
        Args: {
          _role: Database["public"]["Enums"]["crm_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "editor"
      announcement_type: "badge" | "news" | "urgent"
      crm_course_category: "finance" | "computer"
      crm_course_mode: "offline" | "online" | "hybrid"
      crm_enquiry_priority: "low" | "medium" | "high"
      crm_enquiry_source:
        | "walk_in"
        | "phone"
        | "whatsapp"
        | "website"
        | "instagram"
        | "facebook"
        | "referral"
        | "other"
      crm_enquiry_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "converted"
        | "lost"
        | "junk"
      crm_role: "admin" | "counsellor"
      crm_student_gender: "male" | "female" | "other"
      crm_student_status: "active" | "completed" | "dropped" | "on_hold"
      crm_wa_log_status: "link_generated" | "marked_sent"
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
      crm_course_category: ["finance", "computer"],
      crm_course_mode: ["offline", "online", "hybrid"],
      crm_enquiry_priority: ["low", "medium", "high"],
      crm_enquiry_source: [
        "walk_in",
        "phone",
        "whatsapp",
        "website",
        "instagram",
        "facebook",
        "referral",
        "other",
      ],
      crm_enquiry_status: [
        "new",
        "contacted",
        "follow_up",
        "converted",
        "lost",
        "junk",
      ],
      crm_role: ["admin", "counsellor"],
      crm_student_gender: ["male", "female", "other"],
      crm_student_status: ["active", "completed", "dropped", "on_hold"],
      crm_wa_log_status: ["link_generated", "marked_sent"],
    },
  },
} as const
