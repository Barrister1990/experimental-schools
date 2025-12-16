-- ============================================
-- RECALCULATE GRADES FUNCTION AND UPDATE
-- This migration fixes incorrect grades by recalculating them from scores
-- ============================================

-- Function to calculate grade letter from percentage
-- Uses the active grading system configured by admin in the database
CREATE OR REPLACE FUNCTION calculate_grade_from_percentage(percentage NUMERIC)
RETURNS TEXT AS $$
DECLARE
  grade_code TEXT;
  active_system_id UUID;
BEGIN
  -- Get the active grading system ID
  SELECT id INTO active_system_id
  FROM public.grading_system
  WHERE is_active = true
  LIMIT 1;
  
  -- If no active system found, return 'E' as default
  IF active_system_id IS NULL THEN
    RETURN 'E';
  END IF;
  
  -- Find the grade level that matches the percentage
  SELECT code INTO grade_code
  FROM public.grade_levels
  WHERE grading_system_id = active_system_id
    AND percentage >= min_percentage
    AND percentage <= max_percentage
  ORDER BY order_index DESC
  LIMIT 1;
  
  -- Return the grade code, or 'E' if no match found
  RETURN COALESCE(grade_code, 'E');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate total percentage from grade scores
-- Class Score: 50% of (Project + Test1 + Test2 + Group Work)
-- Exam Score: 50% of Exam
-- Total = Class Score + Exam Score
CREATE OR REPLACE FUNCTION calculate_total_percentage(
  project_score NUMERIC,
  test1_score NUMERIC,
  test2_score NUMERIC,
  group_work_score NUMERIC,
  exam_score NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  class_total NUMERIC;
  class_max NUMERIC := 100; -- 40 + 20 + 20 + 20
  class_score NUMERIC;
  exam_score_percentage NUMERIC;
  total_percentage NUMERIC;
BEGIN
  -- Calculate class total
  class_total := COALESCE(project_score, 0) + 
                 COALESCE(test1_score, 0) + 
                 COALESCE(test2_score, 0) + 
                 COALESCE(group_work_score, 0);
  
  -- Calculate class score (50% of class total)
  IF class_max > 0 THEN
    class_score := (class_total / class_max) * 50;
  ELSE
    class_score := 0;
  END IF;
  
  -- Calculate exam score (50% of exam)
  exam_score_percentage := (COALESCE(exam_score, 0) / 100) * 50;
  
  -- Calculate total percentage
  total_percentage := class_score + exam_score_percentage;
  
  RETURN ROUND(total_percentage, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if grade column exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grades' 
    AND column_name = 'grade'
  ) THEN
    ALTER TABLE public.grades ADD COLUMN grade TEXT;
    COMMENT ON COLUMN public.grades.grade IS 'Calculated grade letter (HP, P, AP, D, E)';
  END IF;
END $$;

-- Update all existing grades with correct calculations
UPDATE public.grades
SET 
  grade = calculate_grade_from_percentage(
    calculate_total_percentage(
      project,
      test1,
      test2,
      group_work,
      exam
    )
  ),
  updated_at = NOW()
WHERE 
  -- Only update rows where we have at least one score
  (COALESCE(project, 0) > 0 OR 
   COALESCE(test1, 0) > 0 OR 
   COALESCE(test2, 0) > 0 OR 
   COALESCE(group_work, 0) > 0 OR 
   COALESCE(exam, 0) > 0);

-- Create a trigger function to automatically update grade when scores change
CREATE OR REPLACE FUNCTION update_grade_on_score_change()
RETURNS TRIGGER AS $$
DECLARE
  total_perc NUMERIC;
BEGIN
  -- Calculate total percentage
  total_perc := calculate_total_percentage(
    NEW.project,
    NEW.test1,
    NEW.test2,
    NEW.group_work,
    NEW.exam
  );
  
  -- Calculate and set grade
  NEW.grade := calculate_grade_from_percentage(total_perc);
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_grade_on_score_change ON public.grades;

-- Create trigger to automatically update grade when scores are inserted or updated
CREATE TRIGGER trigger_update_grade_on_score_change
  BEFORE INSERT OR UPDATE OF project, test1, test2, group_work, exam
  ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION update_grade_on_score_change();

-- Add index on grade column for better query performance
CREATE INDEX IF NOT EXISTS idx_grades_grade ON public.grades(grade);

-- Display summary of updated grades
DO $$
DECLARE
  total_updated INTEGER;
  grade_distribution RECORD;
  active_system RECORD;
  grade_level_info RECORD;
BEGIN
  -- Get active grading system info
  SELECT id, name INTO active_system
  FROM public.grading_system
  WHERE is_active = true
  LIMIT 1;
  
  SELECT COUNT(*) INTO total_updated
  FROM public.grades
  WHERE grade IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GRADE RECALCULATION COMPLETE';
  RAISE NOTICE '========================================';
  
  IF active_system.id IS NOT NULL THEN
    RAISE NOTICE 'Using Grading System: %', active_system.name;
    RAISE NOTICE '';
    RAISE NOTICE 'Grade Level Ranges:';
    FOR grade_level_info IN
      SELECT code, name, min_percentage, max_percentage
      FROM public.grade_levels
      WHERE grading_system_id = active_system.id
      ORDER BY order_index DESC
    LOOP
      RAISE NOTICE '  % (%): % - %', 
        grade_level_info.code, 
        grade_level_info.name,
        grade_level_info.min_percentage,
        grade_level_info.max_percentage;
    END LOOP;
  ELSE
    RAISE NOTICE 'WARNING: No active grading system found! Using default.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Total grades updated: %', total_updated;
  RAISE NOTICE '';
  RAISE NOTICE 'Grade Distribution:';
  
  FOR grade_distribution IN
    SELECT 
      grade,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.grades WHERE grade IS NOT NULL), 0), 2) as percentage
    FROM public.grades
    WHERE grade IS NOT NULL
    GROUP BY grade
    ORDER BY 
      CASE grade
        WHEN 'HP' THEN 5
        WHEN 'P' THEN 4
        WHEN 'AP' THEN 3
        WHEN 'D' THEN 2
        WHEN 'E' THEN 1
        ELSE 0
      END DESC
  LOOP
    RAISE NOTICE '  %: % (%)', grade_distribution.grade, grade_distribution.count, grade_distribution.percentage;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

