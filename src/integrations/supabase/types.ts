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
      crm_admission_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          note_type: string
          staff_id: string | null
          staff_name: string | null
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          note_type?: string
          staff_id?: string | null
          staff_name?: string | null
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          note_type?: string
          staff_id?: string | null
          staff_name?: string | null
          student_id?: string
        }
        Relationships: []
      }
      crm_attendance: {
        Row: {
          attended_on: string
          batch_id: string
          created_at: string
          id: string
          marked_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["crm_attendance_status"]
          student_id: string
        }
        Insert: {
          attended_on: string
          batch_id: string
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["crm_attendance_status"]
          student_id: string
        }
        Update: {
          attended_on?: string
          batch_id?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["crm_attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "crm_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "crm_students"
            referencedColumns: ["id"]
          },
        ]
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
      crm_batches: {
        Row: {
          capacity: number
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          faculty_name: string | null
          id: string
          name: string
          notes: string | null
          schedule: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["crm_batch_status"]
          timing: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          faculty_name?: string | null
          id?: string
          name: string
          notes?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["crm_batch_status"]
          timing?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          faculty_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["crm_batch_status"]
          timing?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "crm_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaign_recipients: {
        Row: {
          campaign_id: string
          contact_name: string | null
          contact_number: string
          created_at: string
          id: string
          message_snapshot: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_name?: string | null
          contact_number: string
          created_at?: string
          id?: string
          message_snapshot?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_name?: string | null
          contact_number?: string
          created_at?: string
          id?: string
          message_snapshot?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      crm_campaigns: {
        Row: {
          audience: Database["public"]["Enums"]["crm_campaign_audience"]
          audience_filter: Json | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          message_body: string
          name: string
          scheduled_at: string | null
          sent_count: number
          status: Database["public"]["Enums"]["crm_campaign_status"]
          template_key: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["crm_campaign_audience"]
          audience_filter?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          message_body: string
          name: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["crm_campaign_status"]
          template_key?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["crm_campaign_audience"]
          audience_filter?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          message_body?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["crm_campaign_status"]
          template_key?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_certificates: {
        Row: {
          certificate_no: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          enrolment_no_snapshot: string | null
          grade: string | null
          id: string
          issued_by: string | null
          issued_by_name: string | null
          issued_on: string
          notes: string | null
          pdf_url: string | null
          student_id: string
          student_name_snapshot: string | null
          template_kind: string
          updated_at: string
        }
        Insert: {
          certificate_no?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          enrolment_no_snapshot?: string | null
          grade?: string | null
          id?: string
          issued_by?: string | null
          issued_by_name?: string | null
          issued_on?: string
          notes?: string | null
          pdf_url?: string | null
          student_id: string
          student_name_snapshot?: string | null
          template_kind?: string
          updated_at?: string
        }
        Update: {
          certificate_no?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          enrolment_no_snapshot?: string | null
          grade?: string | null
          id?: string
          issued_by?: string | null
          issued_by_name?: string | null
          issued_on?: string
          notes?: string | null
          pdf_url?: string | null
          student_id?: string
          student_name_snapshot?: string | null
          template_kind?: string
          updated_at?: string
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
          budget_range: Database["public"]["Enums"]["crm_budget_range"] | null
          city: string | null
          class_year: string | null
          college_name: string | null
          company_name: string | null
          converted_student_id: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          current_status:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation: string | null
          email: string | null
          follow_up_date: string | null
          hear_about_us: string | null
          id: string
          lost_reason: string | null
          name: string
          notes: string | null
          phone: string
          preferred_mode: string | null
          preferred_timing:
            | Database["public"]["Enums"]["crm_preferred_timing"]
            | null
          priority: Database["public"]["Enums"]["crm_enquiry_priority"]
          qualification: Database["public"]["Enums"]["crm_qualification"] | null
          referred_by: string | null
          source: Database["public"]["Enums"]["crm_enquiry_source"]
          state: string | null
          status: Database["public"]["Enums"]["crm_enquiry_status"]
          stream: string | null
          updated_at: string
        }
        Insert: {
          alt_phone?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          budget_range?: Database["public"]["Enums"]["crm_budget_range"] | null
          city?: string | null
          class_year?: string | null
          college_name?: string | null
          company_name?: string | null
          converted_student_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_status?:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation?: string | null
          email?: string | null
          follow_up_date?: string | null
          hear_about_us?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string | null
          phone: string
          preferred_mode?: string | null
          preferred_timing?:
            | Database["public"]["Enums"]["crm_preferred_timing"]
            | null
          priority?: Database["public"]["Enums"]["crm_enquiry_priority"]
          qualification?:
            | Database["public"]["Enums"]["crm_qualification"]
            | null
          referred_by?: string | null
          source?: Database["public"]["Enums"]["crm_enquiry_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["crm_enquiry_status"]
          stream?: string | null
          updated_at?: string
        }
        Update: {
          alt_phone?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          budget_range?: Database["public"]["Enums"]["crm_budget_range"] | null
          city?: string | null
          class_year?: string | null
          college_name?: string | null
          company_name?: string | null
          converted_student_id?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_status?:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation?: string | null
          email?: string | null
          follow_up_date?: string | null
          hear_about_us?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string | null
          phone?: string
          preferred_mode?: string | null
          preferred_timing?:
            | Database["public"]["Enums"]["crm_preferred_timing"]
            | null
          priority?: Database["public"]["Enums"]["crm_enquiry_priority"]
          qualification?:
            | Database["public"]["Enums"]["crm_qualification"]
            | null
          referred_by?: string | null
          source?: Database["public"]["Enums"]["crm_enquiry_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["crm_enquiry_status"]
          stream?: string | null
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
      crm_expense_categories: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      crm_expenses: {
        Row: {
          amount: number
          category_id: string | null
          category_name_snapshot: string | null
          created_at: string
          description: string
          id: string
          is_void: boolean
          mode: Database["public"]["Enums"]["crm_payment_mode"]
          notes: string | null
          receipt_url: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          reference: string | null
          spent_on: string
          updated_at: string
          vendor: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          category_name_snapshot?: string | null
          created_at?: string
          description: string
          id?: string
          is_void?: boolean
          mode?: Database["public"]["Enums"]["crm_payment_mode"]
          notes?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference?: string | null
          spent_on?: string
          updated_at?: string
          vendor?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name_snapshot?: string | null
          created_at?: string
          description?: string
          id?: string
          is_void?: boolean
          mode?: Database["public"]["Enums"]["crm_payment_mode"]
          notes?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference?: string | null
          spent_on?: string
          updated_at?: string
          vendor?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crm_expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_fee_plans: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          due_date: string | null
          id: string
          installment_no: number
          is_void: boolean
          label: string | null
          notes: string | null
          plan_type: Database["public"]["Enums"]["crm_fee_plan_type"]
          status: Database["public"]["Enums"]["crm_fee_status"]
          student_id: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment_no?: number
          is_void?: boolean
          label?: string | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["crm_fee_plan_type"]
          status?: Database["public"]["Enums"]["crm_fee_status"]
          student_id: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment_no?: number
          is_void?: boolean
          label?: string | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["crm_fee_plan_type"]
          status?: Database["public"]["Enums"]["crm_fee_status"]
          student_id?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_fee_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "crm_students"
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
          reminder_settings: Json
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
          reminder_settings?: Json
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
          reminder_settings?: Json
          updated_at?: string
          upi_id?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      crm_payments: {
        Row: {
          amount: number
          collected_by: string | null
          collected_by_name: string | null
          created_at: string
          fee_plan_id: string | null
          id: string
          is_void: boolean
          mode: Database["public"]["Enums"]["crm_payment_mode"]
          notes: string | null
          paid_on: string
          receipt_no: string | null
          receipt_pdf_url: string | null
          reference: string | null
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_name: string | null
        }
        Insert: {
          amount: number
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          fee_plan_id?: string | null
          id?: string
          is_void?: boolean
          mode?: Database["public"]["Enums"]["crm_payment_mode"]
          notes?: string | null
          paid_on?: string
          receipt_no?: string | null
          receipt_pdf_url?: string | null
          reference?: string | null
          student_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Update: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          fee_plan_id?: string | null
          id?: string
          is_void?: boolean
          mode?: Database["public"]["Enums"]["crm_payment_mode"]
          notes?: string | null
          paid_on?: string
          receipt_no?: string | null
          receipt_pdf_url?: string | null
          reference?: string | null
          student_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_payments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "crm_fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "crm_students"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_seo_meta: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          json_ld: Json | null
          keywords: string | null
          og_image_url: string | null
          page_path: string
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          keywords?: string | null
          og_image_url?: string | null
          page_path: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          keywords?: string | null
          og_image_url?: string | null
          page_path?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_students: {
        Row: {
          address: string | null
          address_proof_url: string | null
          alt_phone: string | null
          batch_id: string | null
          city: string | null
          class_year: string | null
          college_name: string | null
          company_name: string | null
          course_id: string | null
          course_name_snapshot: string | null
          created_at: string
          created_by: string | null
          current_status:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation: string | null
          discount_amount: number
          discount_reason: string | null
          dob: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          enrolment_date: string
          enrolment_no: string | null
          father_name: string | null
          father_occupation: string | null
          father_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["crm_student_gender"] | null
          hear_about_us: string | null
          id: string
          id_proof_url: string | null
          mother_name: string | null
          net_payable_fee: number | null
          notes: string | null
          phone: string
          photo_url: string | null
          pin: string | null
          qualification: Database["public"]["Enums"]["crm_qualification"] | null
          referred_by: string | null
          registration_fee_paid: number
          source_enquiry_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["crm_student_status"]
          stream: string | null
          total_fee: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_proof_url?: string | null
          alt_phone?: string | null
          batch_id?: string | null
          city?: string | null
          class_year?: string | null
          college_name?: string | null
          company_name?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          current_status?:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation?: string | null
          discount_amount?: number
          discount_reason?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrolment_date?: string
          enrolment_no?: string | null
          father_name?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["crm_student_gender"] | null
          hear_about_us?: string | null
          id?: string
          id_proof_url?: string | null
          mother_name?: string | null
          net_payable_fee?: number | null
          notes?: string | null
          phone: string
          photo_url?: string | null
          pin?: string | null
          qualification?:
            | Database["public"]["Enums"]["crm_qualification"]
            | null
          referred_by?: string | null
          registration_fee_paid?: number
          source_enquiry_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_student_status"]
          stream?: string | null
          total_fee?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_proof_url?: string | null
          alt_phone?: string | null
          batch_id?: string | null
          city?: string | null
          class_year?: string | null
          college_name?: string | null
          company_name?: string | null
          course_id?: string | null
          course_name_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          current_status?:
            | Database["public"]["Enums"]["crm_current_status"]
            | null
          designation?: string | null
          discount_amount?: number
          discount_reason?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrolment_date?: string
          enrolment_no?: string | null
          father_name?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["crm_student_gender"] | null
          hear_about_us?: string | null
          id?: string
          id_proof_url?: string | null
          mother_name?: string | null
          net_payable_fee?: number | null
          notes?: string | null
          phone?: string
          photo_url?: string | null
          pin?: string | null
          qualification?:
            | Database["public"]["Enums"]["crm_qualification"]
            | null
          referred_by?: string | null
          registration_fee_paid?: number
          source_enquiry_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_student_status"]
          stream?: string | null
          total_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "crm_batches"
            referencedColumns: ["id"]
          },
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
      crm_flag_overdue_fee_plans: { Args: never; Returns: number }
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
      crm_attendance_status: "present" | "absent" | "late" | "excused"
      crm_batch_status: "planned" | "running" | "completed" | "cancelled"
      crm_budget_range:
        | "under_5k"
        | "5k_10k"
        | "10k_20k"
        | "20k_plus"
        | "flexible"
      crm_campaign_audience:
        | "all_enquiries"
        | "enquiries_by_status"
        | "all_students"
        | "students_by_course"
        | "students_by_batch"
        | "custom"
      crm_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "completed"
        | "cancelled"
      crm_course_category: "finance" | "computer"
      crm_course_mode: "offline" | "online" | "hybrid"
      crm_current_status:
        | "student"
        | "working_professional"
        | "fresher"
        | "business_owner"
        | "homemaker"
        | "other"
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
        | "website_homepage"
        | "website_course_page"
        | "website_form"
        | "crm_walk_in"
        | "crm_from_catalogue"
        | "crm_manual"
        | "website_enquiry_form"
        | "student_self_fill"
      crm_enquiry_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "converted"
        | "lost"
        | "junk"
      crm_fee_plan_type:
        | "full"
        | "two_emi"
        | "three_emi"
        | "four_emi"
        | "custom"
      crm_fee_status: "pending" | "partial" | "paid" | "overdue" | "waived"
      crm_payment_mode:
        | "cash"
        | "upi"
        | "bank_transfer"
        | "card"
        | "cheque"
        | "other"
      crm_preferred_timing:
        | "morning"
        | "afternoon"
        | "evening"
        | "weekend"
        | "flexible"
      crm_qualification:
        | "class_10"
        | "class_12"
        | "graduation"
        | "post_graduation"
        | "diploma"
        | "other"
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
      crm_attendance_status: ["present", "absent", "late", "excused"],
      crm_batch_status: ["planned", "running", "completed", "cancelled"],
      crm_budget_range: [
        "under_5k",
        "5k_10k",
        "10k_20k",
        "20k_plus",
        "flexible",
      ],
      crm_campaign_audience: [
        "all_enquiries",
        "enquiries_by_status",
        "all_students",
        "students_by_course",
        "students_by_batch",
        "custom",
      ],
      crm_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "completed",
        "cancelled",
      ],
      crm_course_category: ["finance", "computer"],
      crm_course_mode: ["offline", "online", "hybrid"],
      crm_current_status: [
        "student",
        "working_professional",
        "fresher",
        "business_owner",
        "homemaker",
        "other",
      ],
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
        "website_homepage",
        "website_course_page",
        "website_form",
        "crm_walk_in",
        "crm_from_catalogue",
        "crm_manual",
        "website_enquiry_form",
        "student_self_fill",
      ],
      crm_enquiry_status: [
        "new",
        "contacted",
        "follow_up",
        "converted",
        "lost",
        "junk",
      ],
      crm_fee_plan_type: ["full", "two_emi", "three_emi", "four_emi", "custom"],
      crm_fee_status: ["pending", "partial", "paid", "overdue", "waived"],
      crm_payment_mode: [
        "cash",
        "upi",
        "bank_transfer",
        "card",
        "cheque",
        "other",
      ],
      crm_preferred_timing: [
        "morning",
        "afternoon",
        "evening",
        "weekend",
        "flexible",
      ],
      crm_qualification: [
        "class_10",
        "class_12",
        "graduation",
        "post_graduation",
        "diploma",
        "other",
      ],
      crm_role: ["admin", "counsellor"],
      crm_student_gender: ["male", "female", "other"],
      crm_student_status: ["active", "completed", "dropped", "on_hold"],
      crm_wa_log_status: ["link_generated", "marked_sent"],
    },
  },
} as const
