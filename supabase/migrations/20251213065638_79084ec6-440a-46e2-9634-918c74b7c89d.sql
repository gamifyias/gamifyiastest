-- Create enum for user roles (including null/pending for new users)
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'student', 'pending');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    color TEXT DEFAULT '#6366f1',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create topics table
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    xp_reward INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq_single', 'mcq_multiple', 'true_false', 'numeric')),
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    marks DECIMAL(5,2) NOT NULL DEFAULT 1,
    negative_marks DECIMAL(5,2) DEFAULT 0,
    explanation TEXT,
    correct_answer TEXT, -- For numeric/true_false
    correct_options TEXT[], -- For MCQ (array of option IDs)
    randomize_options BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question_options table
CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    is_correct BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    test_type TEXT DEFAULT 'mixed' CHECK (test_type IN ('subject', 'topic', 'mixed', 'weak_areas')),
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks DECIMAL(7,2) DEFAULT 0,
    pass_marks DECIMAL(7,2) DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    
    -- Scheduling
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_anytime BOOLEAN DEFAULT false,
    
    -- Settings
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT true,
    shuffle_options BOOLEAN DEFAULT true,
    show_results BOOLEAN DEFAULT true,
    show_answers BOOLEAN DEFAULT false,
    allow_navigation BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT true,
    question_by_question BOOLEAN DEFAULT false,
    auto_submit BOOLEAN DEFAULT true,
    
    -- Anti-cheat
    anti_cheat_enabled BOOLEAN DEFAULT true,
    fullscreen_required BOOLEAN DEFAULT true,
    tab_switch_limit INTEGER DEFAULT 3,
    watermark_enabled BOOLEAN DEFAULT true,
    
    -- Difficulty distribution (percentages)
    easy_percentage INTEGER DEFAULT 30,
    medium_percentage INTEGER DEFAULT 50,
    hard_percentage INTEGER DEFAULT 20,
    
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_questions junction table
CREATE TABLE public.test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    marks_override DECIMAL(5,2),
    negative_marks_override DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(test_id, question_id)
);

-- Create test_topics junction table (for topic-based tests)
CREATE TABLE public.test_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    question_count INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(test_id, topic_id)
);

-- Create test_assignments table
CREATE TABLE public.test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(test_id, user_id)
);

-- Create student_test_attempts table
CREATE TABLE public.student_test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    
    -- Scores
    total_marks DECIMAL(7,2) DEFAULT 0,
    obtained_marks DECIMAL(7,2) DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Stats
    total_questions INTEGER DEFAULT 0,
    attempted_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    skipped_questions INTEGER DEFAULT 0,
    
    -- Anti-cheat
    tab_switches INTEGER DEFAULT 0,
    fullscreen_exits INTEGER DEFAULT 0,
    copy_attempts INTEGER DEFAULT 0,
    right_click_attempts INTEGER DEFAULT 0,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'terminated')),
    is_passed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_answers table
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.student_test_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    
    selected_options TEXT[], -- For MCQ
    text_answer TEXT, -- For numeric/text
    
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    
    is_marked_for_review BOOLEAN DEFAULT false,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(attempt_id, question_id)
);

-- Create student_weak_questions table (for adaptive retest)
CREATE TABLE public.student_weak_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    
    wrong_count INTEGER DEFAULT 1,
    correct_count INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_mastered BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, question_id)
);

-- Create anti_cheat_logs table
CREATE TABLE public.anti_cheat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.student_test_attempts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    violation_type TEXT NOT NULL CHECK (violation_type IN (
        'tab_switch', 'fullscreen_exit', 'copy_attempt', 'paste_attempt',
        'right_click', 'devtools_open', 'network_disconnect', 'time_tamper',
        'storage_tamper', 'js_disabled', 'page_reload', 'back_button'
    )),
    violation_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    total_xp INTEGER DEFAULT 0,
    total_coins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    tests_completed INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    
    rank_position INTEGER,
    rank_title TEXT DEFAULT 'Beginner',
    
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_id UUID REFERENCES public.student_test_attempts(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    
    certificate_number TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_weak_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_cheat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    
    -- Create user_role with pending status
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
    
    -- Create leaderboard entry
    INSERT INTO public.leaderboard (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_test_attempts_updated_at BEFORE UPDATE ON public.student_test_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_answers_updated_at BEFORE UPDATE ON public.student_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_weak_questions_updated_at BEFORE UPDATE ON public.student_weak_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON public.leaderboard FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and mentors can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects
CREATE POLICY "Anyone can view active subjects" ON public.subjects FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and mentors can view all subjects" ON public.subjects FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can insert subjects" ON public.subjects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can update subjects" ON public.subjects FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for topics
CREATE POLICY "Anyone can view active topics" ON public.topics FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and mentors can view all topics" ON public.topics FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can insert topics" ON public.topics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can update topics" ON public.topics FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins can delete topics" ON public.topics FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for questions
CREATE POLICY "Admins and mentors can view questions" ON public.questions FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view questions in their tests" ON public.questions FOR SELECT USING (
    public.has_role(auth.uid(), 'student') AND EXISTS (
        SELECT 1 FROM public.test_questions tq
        JOIN public.test_assignments ta ON ta.test_id = tq.test_id
        WHERE tq.question_id = questions.id AND ta.user_id = auth.uid()
    )
);
CREATE POLICY "Admins and mentors can insert questions" ON public.questions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can update questions" ON public.questions FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for question_options
CREATE POLICY "Admins and mentors can view options" ON public.question_options FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view options for assigned tests" ON public.question_options FOR SELECT USING (
    public.has_role(auth.uid(), 'student') AND EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.test_questions tq ON tq.question_id = q.id
        JOIN public.test_assignments ta ON ta.test_id = tq.test_id
        WHERE question_options.question_id = q.id AND ta.user_id = auth.uid()
    )
);
CREATE POLICY "Admins and mentors can manage options" ON public.question_options FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- RLS Policies for tests
CREATE POLICY "Admins and mentors can view all tests" ON public.tests FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view assigned tests" ON public.tests FOR SELECT USING (
    (is_public = true AND is_active = true) OR
    (public.has_role(auth.uid(), 'student') AND EXISTS (
        SELECT 1 FROM public.test_assignments WHERE test_id = tests.id AND user_id = auth.uid()
    ))
);
CREATE POLICY "Admins and mentors can insert tests" ON public.tests FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins and mentors can update tests" ON public.tests FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Admins can delete tests" ON public.tests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for test_questions
CREATE POLICY "Admins and mentors can manage test_questions" ON public.test_questions FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view test_questions for assigned tests" ON public.test_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.test_assignments WHERE test_id = test_questions.test_id AND user_id = auth.uid())
);

-- RLS Policies for test_topics
CREATE POLICY "Admins and mentors can manage test_topics" ON public.test_topics FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view test_topics for assigned tests" ON public.test_topics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.test_assignments WHERE test_id = test_topics.test_id AND user_id = auth.uid())
);

-- RLS Policies for test_assignments
CREATE POLICY "Admins and mentors can manage assignments" ON public.test_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "Students can view their assignments" ON public.test_assignments FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for student_test_attempts
CREATE POLICY "Students can manage their own attempts" ON public.student_test_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins and mentors can view all attempts" ON public.student_test_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- RLS Policies for student_answers
CREATE POLICY "Students can manage their own answers" ON public.student_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_test_attempts WHERE id = student_answers.attempt_id AND user_id = auth.uid())
);
CREATE POLICY "Admins and mentors can view all answers" ON public.student_answers FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- RLS Policies for student_weak_questions
CREATE POLICY "Students can manage their weak questions" ON public.student_weak_questions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins and mentors can view weak questions" ON public.student_weak_questions FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- RLS Policies for anti_cheat_logs
CREATE POLICY "Students can insert their own logs" ON public.anti_cheat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and mentors can view all logs" ON public.anti_cheat_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can update their own leaderboard" ON public.leaderboard FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for certificates
CREATE POLICY "Users can view their own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX idx_questions_topic_id ON public.questions(topic_id);
CREATE INDEX idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_assignments_user_id ON public.test_assignments(user_id);
CREATE INDEX idx_test_assignments_test_id ON public.test_assignments(test_id);
CREATE INDEX idx_student_test_attempts_user_id ON public.student_test_attempts(user_id);
CREATE INDEX idx_student_test_attempts_test_id ON public.student_test_attempts(test_id);
CREATE INDEX idx_student_answers_attempt_id ON public.student_answers(attempt_id);
CREATE INDEX idx_student_weak_questions_user_id ON public.student_weak_questions(user_id);
CREATE INDEX idx_anti_cheat_logs_attempt_id ON public.anti_cheat_logs(attempt_id);
CREATE INDEX idx_leaderboard_total_xp ON public.leaderboard(total_xp DESC);