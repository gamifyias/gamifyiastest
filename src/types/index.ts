// User & Auth Types
export type UserRole = 'admin' | 'mentor' | 'student' | 'pending';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Subject & Topic Types
export interface Subject {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  color: string;
  created_by?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  topics?: Topic[];
  topic_count?: number;
  question_count?: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  image_url?: string;
  difficulty_level: DifficultyLevel;
  xp_reward: number;
  is_active: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  question_count?: number;
}

// Question Types
export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'numeric';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  option_image_url?: string;
  is_correct: boolean;
  sort_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  question_type: QuestionType;
  question_text: string;
  question_image_url?: string;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  explanation?: string;
  correct_answer?: string;
  correct_options?: string[];
  randomize_options: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
  subject?: Subject;
  topic?: Topic;
}

// Test Types
export type TestType = 'subject' | 'topic' | 'mixed' | 'weak_areas';
export type TestStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'terminated';

export interface Test {
  id: string;
  title: string;
  description?: string;
  subject_id?: string;
  test_type: TestType;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  total_questions: number;
  
  // Scheduling
  start_time?: string;
  end_time?: string;
  is_anytime: boolean;
  
  // Settings
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results: boolean;
  show_answers: boolean;
  allow_navigation: boolean;
  allow_review: boolean;
  question_by_question: boolean;
  auto_submit: boolean;
  
  // Anti-cheat
  anti_cheat_enabled: boolean;
  fullscreen_required: boolean;
  tab_switch_limit: number;
  watermark_enabled: boolean;
  
  // Difficulty distribution
  easy_percentage: number;
  medium_percentage: number;
  hard_percentage: number;
  
  is_public: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  subject?: Subject;
  questions?: Question[];
  assignment?: TestAssignment;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  sort_order: number;
  marks_override?: number;
  negative_marks_override?: number;
  created_at: string;
  question?: Question;
}

export interface TestTopic {
  id: string;
  test_id: string;
  topic_id: string;
  question_count: number;
  created_at: string;
  topic?: Topic;
}

export interface TestAssignment {
  id: string;
  test_id: string;
  user_id: string;
  assigned_by?: string;
  assigned_at: string;
  due_date?: string;
  is_completed: boolean;
  test?: Test;
}

// Attempt Types
export interface StudentTestAttempt {
  id: string;
  test_id: string;
  user_id: string;
  attempt_number: number;
  
  // Timing
  started_at: string;
  submitted_at?: string;
  time_taken_seconds?: number;
  
  // Scores
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  
  // Stats
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  
  // Anti-cheat
  tab_switches: number;
  fullscreen_exits: number;
  copy_attempts: number;
  right_click_attempts: number;
  is_flagged: boolean;
  flag_reason?: string;
  
  status: TestStatus;
  is_passed: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  test?: Test;
  answers?: StudentAnswer[];
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_options?: string[];
  text_answer?: string;
  is_correct?: boolean;
  marks_obtained: number;
  time_spent_seconds: number;
  is_marked_for_review: boolean;
  answered_at?: string;
  created_at: string;
  updated_at: string;
  question?: Question;
}

export interface StudentWeakQuestion {
  id: string;
  user_id: string;
  question_id: string;
  topic_id: string;
  wrong_count: number;
  correct_count: number;
  last_attempted_at: string;
  is_mastered: boolean;
  created_at: string;
  updated_at: string;
  question?: Question;
  topic?: Topic;
}

// Anti-Cheat Types
export type ViolationType = 
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'right_click'
  | 'devtools_open'
  | 'network_disconnect'
  | 'time_tamper'
  | 'storage_tamper'
  | 'js_disabled'
  | 'page_reload'
  | 'back_button';

export interface AntiCheatLog {
  id: string;
  attempt_id: string;
  user_id: string;
  violation_type: ViolationType;
  violation_details?: Record<string, unknown>;
  created_at: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_xp: number;
  total_coins: number;
  current_streak: number;
  longest_streak: number;
  tests_completed: number;
  tests_passed: number;
  average_score: number;
  rank_position?: number;
  rank_title: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

// Certificate Types
export interface Certificate {
  id: string;
  user_id: string;
  attempt_id: string;
  test_id?: string;
  certificate_number: string;
  issued_at: string;
  created_at: string;
  test?: Test;
  attempt?: StudentTestAttempt;
}

// Analytics Types
export interface StudentAnalytics {
  user_id: string;
  total_tests_taken: number;
  total_score: number;
  total_marks: number;
  average_accuracy: number;
  topic_performance: {
    topic_id: string;
    topic_name: string;
    accuracy: number;
    tests_taken: number;
  }[];
  difficulty_performance: {
    difficulty: DifficultyLevel;
    accuracy: number;
    questions_attempted: number;
  }[];
  weak_topics: string[];
  xp_earned: number;
  level: number;
  rank?: number;
}

// Gamification Types
export interface StudentProgress {
  user_id: string;
  xp: number;
  level: number;
  coins: number;
  completed_topics: string[];
  completed_subjects: string[];
  achievements: string[];
  streak_days: number;
  last_active_at: string;
}
