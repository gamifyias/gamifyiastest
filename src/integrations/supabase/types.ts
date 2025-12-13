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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anti_cheat_logs: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          user_id: string
          violation_details: Json | null
          violation_type: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          user_id: string
          violation_details?: Json | null
          violation_type: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          user_id?: string
          violation_details?: Json | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "anti_cheat_logs_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "student_test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          attempt_id: string
          certificate_number: string
          created_at: string
          id: string
          issued_at: string
          test_id: string | null
          user_id: string
        }
        Insert: {
          attempt_id: string
          certificate_number: string
          created_at?: string
          id?: string
          issued_at?: string
          test_id?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string
          certificate_number?: string
          created_at?: string
          id?: string
          issued_at?: string
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "student_test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard: {
        Row: {
          average_score: number | null
          created_at: string
          current_streak: number | null
          id: string
          last_activity_at: string | null
          longest_streak: number | null
          rank_position: number | null
          rank_title: string | null
          tests_completed: number | null
          tests_passed: number | null
          total_coins: number | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          longest_streak?: number | null
          rank_position?: number | null
          rank_title?: string | null
          tests_completed?: number | null
          tests_passed?: number | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_at?: string | null
          longest_streak?: number | null
          rank_position?: number | null
          rank_title?: string | null
          tests_completed?: number | null
          tests_passed?: number | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          option_image_url: string | null
          option_text: string
          question_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          option_image_url?: string | null
          option_text: string
          question_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          option_image_url?: string | null
          option_text?: string
          question_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string | null
          correct_options: string[] | null
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean | null
          marks: number
          negative_marks: number | null
          question_image_url: string | null
          question_text: string
          question_type: string
          randomize_options: boolean | null
          subject_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          correct_answer?: string | null
          correct_options?: string[] | null
          created_at?: string
          created_by?: string | null
          difficulty: string
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          marks?: number
          negative_marks?: number | null
          question_image_url?: string | null
          question_text: string
          question_type: string
          randomize_options?: boolean | null
          subject_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string | null
          correct_options?: string[] | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          marks?: number
          negative_marks?: number | null
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          randomize_options?: boolean | null
          subject_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          is_marked_for_review: boolean | null
          marks_obtained: number | null
          question_id: string
          selected_options: string[] | null
          text_answer: string | null
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          is_marked_for_review?: boolean | null
          marks_obtained?: number | null
          question_id: string
          selected_options?: string[] | null
          text_answer?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          is_marked_for_review?: boolean | null
          marks_obtained?: number | null
          question_id?: string
          selected_options?: string[] | null
          text_answer?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "student_test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_test_attempts: {
        Row: {
          attempt_number: number
          attempted_questions: number | null
          copy_attempts: number | null
          correct_answers: number | null
          created_at: string
          flag_reason: string | null
          fullscreen_exits: number | null
          id: string
          is_flagged: boolean | null
          is_passed: boolean | null
          obtained_marks: number | null
          percentage: number | null
          right_click_attempts: number | null
          skipped_questions: number | null
          started_at: string
          status: string | null
          submitted_at: string | null
          tab_switches: number | null
          test_id: string
          time_taken_seconds: number | null
          total_marks: number | null
          total_questions: number | null
          updated_at: string
          user_id: string
          wrong_answers: number | null
        }
        Insert: {
          attempt_number?: number
          attempted_questions?: number | null
          copy_attempts?: number | null
          correct_answers?: number | null
          created_at?: string
          flag_reason?: string | null
          fullscreen_exits?: number | null
          id?: string
          is_flagged?: boolean | null
          is_passed?: boolean | null
          obtained_marks?: number | null
          percentage?: number | null
          right_click_attempts?: number | null
          skipped_questions?: number | null
          started_at?: string
          status?: string | null
          submitted_at?: string | null
          tab_switches?: number | null
          test_id: string
          time_taken_seconds?: number | null
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id: string
          wrong_answers?: number | null
        }
        Update: {
          attempt_number?: number
          attempted_questions?: number | null
          copy_attempts?: number | null
          correct_answers?: number | null
          created_at?: string
          flag_reason?: string | null
          fullscreen_exits?: number | null
          id?: string
          is_flagged?: boolean | null
          is_passed?: boolean | null
          obtained_marks?: number | null
          percentage?: number | null
          right_click_attempts?: number | null
          skipped_questions?: number | null
          started_at?: string
          status?: string | null
          submitted_at?: string | null
          tab_switches?: number | null
          test_id?: string
          time_taken_seconds?: number | null
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_weak_questions: {
        Row: {
          correct_count: number | null
          created_at: string
          id: string
          is_mastered: boolean | null
          last_attempted_at: string | null
          question_id: string
          topic_id: string
          updated_at: string
          user_id: string
          wrong_count: number | null
        }
        Insert: {
          correct_count?: number | null
          created_at?: string
          id?: string
          is_mastered?: boolean | null
          last_attempted_at?: string | null
          question_id: string
          topic_id: string
          updated_at?: string
          user_id: string
          wrong_count?: number | null
        }
        Update: {
          correct_count?: number | null
          created_at?: string
          id?: string
          is_mastered?: boolean | null
          last_attempted_at?: string | null
          question_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_weak_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_weak_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          test_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          test_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string
          id: string
          marks_override: number | null
          negative_marks_override: number | null
          question_id: string
          sort_order: number | null
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks_override?: number | null
          negative_marks_override?: number | null
          question_id: string
          sort_order?: number | null
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marks_override?: number | null
          negative_marks_override?: number | null
          question_id?: string
          sort_order?: number | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_topics: {
        Row: {
          created_at: string
          id: string
          question_count: number | null
          test_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_count?: number | null
          test_id: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_count?: number | null
          test_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_topics_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          allow_navigation: boolean | null
          allow_review: boolean | null
          anti_cheat_enabled: boolean | null
          auto_submit: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          easy_percentage: number | null
          end_time: string | null
          fullscreen_required: boolean | null
          hard_percentage: number | null
          id: string
          is_active: boolean | null
          is_anytime: boolean | null
          is_public: boolean | null
          max_attempts: number | null
          medium_percentage: number | null
          pass_marks: number | null
          question_by_question: boolean | null
          show_answers: boolean | null
          show_results: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          start_time: string | null
          subject_id: string | null
          tab_switch_limit: number | null
          test_type: string | null
          title: string
          total_marks: number | null
          total_questions: number | null
          updated_at: string
          watermark_enabled: boolean | null
        }
        Insert: {
          allow_navigation?: boolean | null
          allow_review?: boolean | null
          anti_cheat_enabled?: boolean | null
          auto_submit?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          easy_percentage?: number | null
          end_time?: string | null
          fullscreen_required?: boolean | null
          hard_percentage?: number | null
          id?: string
          is_active?: boolean | null
          is_anytime?: boolean | null
          is_public?: boolean | null
          max_attempts?: number | null
          medium_percentage?: number | null
          pass_marks?: number | null
          question_by_question?: boolean | null
          show_answers?: boolean | null
          show_results?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          start_time?: string | null
          subject_id?: string | null
          tab_switch_limit?: number | null
          test_type?: string | null
          title: string
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
          watermark_enabled?: boolean | null
        }
        Update: {
          allow_navigation?: boolean | null
          allow_review?: boolean | null
          anti_cheat_enabled?: boolean | null
          auto_submit?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          easy_percentage?: number | null
          end_time?: string | null
          fullscreen_required?: boolean | null
          hard_percentage?: number | null
          id?: string
          is_active?: boolean | null
          is_anytime?: boolean | null
          is_public?: boolean | null
          max_attempts?: number | null
          medium_percentage?: number | null
          pass_marks?: number | null
          question_by_question?: boolean | null
          show_answers?: boolean | null
          show_results?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          start_time?: string | null
          subject_id?: string | null
          tab_switch_limit?: number | null
          test_type?: string | null
          title?: string
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
          watermark_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          subject_id: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          subject_id: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          subject_id?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "student" | "pending"
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
      app_role: ["admin", "mentor", "student", "pending"],
    },
  },
} as const
