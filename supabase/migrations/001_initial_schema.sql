-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Stores user information (teachers and admins)
-- Links to Supabase Auth via email
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'class_teacher', 'subject_teacher')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  password_change_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- ============================================
-- ADMINS TABLE
-- Stores admin-specific information
-- ============================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- ============================================
-- CLASSES TABLE
-- Stores class information (KG 1, KG 2, Basic 1-9)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 10), -- 0=KG1, 1=KG2, 2=Basic1, ..., 10=Basic9
  stream TEXT,
  class_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 30,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_level ON public.classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(class_teacher_id);

-- ============================================
-- STUDENTS TABLE
-- Stores student information
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  class_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT,
  address TEXT,
  enrollment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- ============================================
-- SUBJECTS TABLE
-- Stores subject information
-- ============================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('core', 'elective')),
  description TEXT,
  level_categories TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['KG', 'Lower Primary', 'Upper Primary', 'JHS']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);

-- ============================================
-- SUBJECT ASSIGNMENTS TABLE
-- Links subjects to teachers and classes
-- ============================================
CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, teacher_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_assignments_teacher ON public.subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_class ON public.subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject ON public.subject_assignments(subject_id);

-- ============================================
-- GRADES TABLE
-- Stores student grades
-- ============================================
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  academic_year TEXT NOT NULL,
  project NUMERIC(5,2) DEFAULT 0,
  test1 NUMERIC(5,2) DEFAULT 0,
  test2 NUMERIC(5,2) DEFAULT 0,
  group_work NUMERIC(5,2) DEFAULT 0,
  exam NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_class ON public.grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher ON public.grades(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_term ON public.grades(term, academic_year);

-- ============================================
-- ATTENDANCE TABLE
-- Stores student attendance summaries (per term)
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  academic_year TEXT NOT NULL,
  total_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  excused_days INTEGER NOT NULL DEFAULT 0,
  attendance_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_days > 0 THEN (present_days::NUMERIC / total_days::NUMERIC * 100)
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_term ON public.attendance(term, academic_year);

-- ============================================
-- CLASS TEACHER EVALUATIONS TABLE
-- Stores conduct, interest, and rewards
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  academic_year TEXT NOT NULL,
  conduct_rating TEXT CHECK (conduct_rating IN ('Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement')),
  conduct_remarks TEXT,
  interest_level TEXT CHECK (interest_level IN ('Very High', 'High', 'Moderate', 'Low', 'Very Low')),
  interest_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_student ON public.class_teacher_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_teacher ON public.class_teacher_evaluations(teacher_id);

-- ============================================
-- CLASS TEACHER REWARDS TABLE
-- Stores rewards awarded to students
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_teacher_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('Merit', 'Achievement', 'Participation', 'Leadership', 'Improvement', 'Other')),
  description TEXT,
  date_awarded DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_student ON public.class_teacher_rewards(student_id);
CREATE INDEX IF NOT EXISTS idx_rewards_teacher ON public.class_teacher_rewards(teacher_id);

-- ============================================
-- GRADING SYSTEM TABLE
-- Stores the universal grading system configuration
-- ============================================
CREATE TABLE IF NOT EXISTS public.grading_system (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Ghanaian Basic School Grading System',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grade_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grading_system_id UUID REFERENCES public.grading_system(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  min_percentage NUMERIC(5,2) NOT NULL,
  max_percentage NUMERIC(5,2) NOT NULL,
  order_index INTEGER NOT NULL,
  color_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grading_system_id, code)
);

CREATE INDEX IF NOT EXISTS idx_grade_levels_system ON public.grade_levels(grading_system_id);

-- ============================================
-- BECE RESULTS TABLE
-- Stores BECE results for graduated students
-- ============================================
CREATE TABLE IF NOT EXISTS public.bece_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bece_student ON public.bece_results(student_id);
CREATE INDEX IF NOT EXISTS idx_bece_year ON public.bece_results(academic_year);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.class_teacher_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grading_system_updated_at BEFORE UPDATE ON public.grading_system
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bece_results_updated_at BEFORE UPDATE ON public.bece_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT GRADING SYSTEM
-- ============================================
INSERT INTO public.grading_system (name, description, is_active)
VALUES ('Ghanaian Basic School Grading System', 'Standard grading system for Hohoe Experimental Schools.', true)
ON CONFLICT DO NOTHING;

-- Insert default grade levels
INSERT INTO public.grade_levels (grading_system_id, code, name, min_percentage, max_percentage, order_index, color_class)
SELECT 
  gs.id,
  level.code,
  level.name,
  level.min_percentage,
  level.max_percentage,
  level.order_index,
  level.color_class
FROM public.grading_system gs
CROSS JOIN (VALUES
  ('HP', 'High Proficient', 80, 100, 1, 'bg-green-100 text-green-800'),
  ('P', 'Proficient', 68, 79, 2, 'bg-blue-100 text-blue-800'),
  ('AP', 'Approaching Proficiency', 54, 67, 3, 'bg-yellow-100 text-yellow-800'),
  ('D', 'Developing', 40, 53, 4, 'bg-orange-100 text-orange-800'),
  ('E', 'Emerging', 0, 39, 5, 'bg-red-100 text-red-800')
) AS level(code, name, min_percentage, max_percentage, order_index, color_class)
WHERE gs.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bece_results ENABLE ROW LEVEL SECURITY;

-- Basic policies (can be refined later)
-- Admins can do everything
CREATE POLICY "Admins can do everything" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      WHERE u.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can do everything" ON public.admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      JOIN public.users u ON a.user_id = u.id
      WHERE u.email = auth.jwt() ->> 'email'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- For now, allow all authenticated users to read (can be restricted later)
CREATE POLICY "Authenticated users can read" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read" ON public.students
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read" ON public.subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Note: More specific RLS policies should be added based on your security requirements

