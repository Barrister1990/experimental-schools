-- ============================================
-- SCHOOL SETTINGS TABLE
-- Stores school information
-- ============================================
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'HOHOE EXPERIMENTAL SCHOOLS',
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id) -- Only one school settings record
);

-- Insert default school settings
INSERT INTO public.school_settings (name, address, phone, email, website)
VALUES ('HOHOE EXPERIMENTAL SCHOOLS', 'Hohoe, Volta Region, Ghana', '+233 XX XXX XXXX', 'info@hohoebasica.edu.gh', 'www.hohoebasica.edu.gh')
ON CONFLICT DO NOTHING;

-- ============================================
-- ACADEMIC SETTINGS TABLE
-- Stores current academic year and term
-- ============================================
CREATE TABLE IF NOT EXISTS public.academic_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_academic_year TEXT NOT NULL DEFAULT '2024/2025',
  current_term INTEGER NOT NULL DEFAULT 1 CHECK (current_term IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id) -- Only one academic settings record
);

-- Insert default academic settings
INSERT INTO public.academic_settings (current_academic_year, current_term)
VALUES ('2024/2025', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- ASSESSMENT STRUCTURE TABLE
-- Stores standard assessment marks structure
-- ============================================
CREATE TABLE IF NOT EXISTS public.assessment_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project NUMERIC(5,2) NOT NULL DEFAULT 40,
  test1 NUMERIC(5,2) NOT NULL DEFAULT 20,
  test2 NUMERIC(5,2) NOT NULL DEFAULT 20,
  group_work NUMERIC(5,2) NOT NULL DEFAULT 20,
  exam NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id) -- Only one assessment structure record
);

-- Insert default assessment structure
INSERT INTO public.assessment_structure (project, test1, test2, group_work, exam)
VALUES (40, 20, 20, 20, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- USER PREFERENCES TABLE
-- Stores user-specific preferences (notifications, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  grade_alerts BOOLEAN DEFAULT true,
  attendance_alerts BOOLEAN DEFAULT true,
  report_alerts BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ============================================
-- SYSTEM PREFERENCES TABLE
-- Stores system-wide preferences
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_backup BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  data_retention_years INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id) -- Only one system preferences record
);

-- Insert default system preferences
INSERT INTO public.system_preferences (auto_backup, backup_frequency, data_retention_years)
VALUES (true, 'daily', 5)
ON CONFLICT DO NOTHING;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_settings_updated_at BEFORE UPDATE ON public.academic_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_structure_updated_at BEFORE UPDATE ON public.assessment_structure
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_preferences_updated_at BEFORE UPDATE ON public.system_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_preferences ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read school settings" ON public.school_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read academic settings" ON public.academic_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read assessment structure" ON public.assessment_structure
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read system preferences" ON public.system_preferences
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can view and update their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Admins can modify all settings
CREATE POLICY "Admins can modify school settings" ON public.school_settings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can modify academic settings" ON public.academic_settings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can modify assessment structure" ON public.assessment_structure
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can modify system preferences" ON public.system_preferences
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

