-- ============================================
-- VERIFY TRIGGER AND FIX GRADES
-- This script verifies the trigger exists and tests it
-- ============================================

-- Step 1: Check if trigger exists and create if needed
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name = 'trigger_update_grade_on_score_change'
      AND event_object_table = 'grades'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✓ Trigger exists: trigger_update_grade_on_score_change';
  ELSE
    RAISE NOTICE '✗ Trigger does NOT exist!';
    RAISE NOTICE 'Please run the migration: supabase/migrations/011_ensure_grade_recalculation.sql';
  END IF;
END $$;

-- Ensure trigger function exists (must be outside DO block)
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
  
  -- Calculate and set grade using admin-configured system
  NEW.grade := calculate_grade_from_percentage(total_perc);
  
  -- Update updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists (must be outside DO block)
DROP TRIGGER IF EXISTS trigger_update_grade_on_score_change ON public.grades;

CREATE TRIGGER trigger_update_grade_on_score_change
  BEFORE INSERT OR UPDATE OF project, test1, test2, group_work, exam
  ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION update_grade_on_score_change();

-- Step 2: Test the trigger with a specific example (79.5%)
DO $$
DECLARE
  test_grade_id UUID;
  test_student_name TEXT;
  test_subject_name TEXT;
  old_grade TEXT;
  new_grade TEXT;
  calculated_total NUMERIC;
BEGIN
  -- Find a grade with ~79.5% total
  SELECT 
    g.id,
    s.first_name || ' ' || s.last_name,
    sub.name,
    g.grade,
    calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam)
  INTO 
    test_grade_id,
    test_student_name,
    test_subject_name,
    old_grade,
    calculated_total
  FROM public.grades g
  JOIN public.students s ON g.student_id = s.id
  JOIN public.subjects sub ON g.subject_id = sub.id
  WHERE ABS(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) - 79.5) < 1
  LIMIT 1;
  
  IF test_grade_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Testing trigger with example:';
    RAISE NOTICE '  Student: %', test_student_name;
    RAISE NOTICE '  Subject: %', test_subject_name;
    RAISE NOTICE '  Current Total: %', calculated_total;
    RAISE NOTICE '  Current Grade: %', old_grade;
    RAISE NOTICE '  Expected Grade: %', calculate_grade_from_percentage(calculated_total);
    
    -- Trigger an update to test the trigger
    UPDATE public.grades
    SET 
      project = project, -- No actual change, but triggers UPDATE
      updated_at = NOW()
    WHERE id = test_grade_id;
    
    -- Get the updated grade
    SELECT grade INTO new_grade
    FROM public.grades
    WHERE id = test_grade_id;
    
    RAISE NOTICE '  Grade after trigger: %', new_grade;
    
    IF new_grade = calculate_grade_from_percentage(calculated_total) THEN
      RAISE NOTICE '  ✓ Trigger is working correctly!';
    ELSE
      RAISE NOTICE '  ✗ Trigger is NOT working correctly!';
      RAISE NOTICE '  Expected: %, Got: %', calculate_grade_from_percentage(calculated_total), new_grade;
    END IF;
  ELSE
    RAISE NOTICE 'No grade found with ~79.5%% total to test';
  END IF;
END $$;

-- Step 3: Recalculate ALL grades to ensure they're correct
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
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
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '';
  RAISE NOTICE 'Recalculated % grade records', updated_count;
END $$;

-- Step 4: Show active grading system and ranges
DO $$
DECLARE
  active_system_name TEXT;
  grade_level_info RECORD;
BEGIN
  SELECT name INTO active_system_name
  FROM public.grading_system
  WHERE is_active = true
  LIMIT 1;
  
  IF active_system_name IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Active Grading System: %', active_system_name;
    RAISE NOTICE 'Grade Ranges:';
    
    FOR grade_level_info IN
      SELECT code, min_percentage, max_percentage, name
      FROM public.grade_levels
      WHERE grading_system_id = (
        SELECT id FROM public.grading_system WHERE is_active = true LIMIT 1
      )
      ORDER BY order_index DESC
    LOOP
      RAISE NOTICE '%', 
        '  ' || grade_level_info.code || ': ' || 
        grade_level_info.min_percentage::TEXT || '% - ' || 
        grade_level_info.max_percentage::TEXT || '% (' || 
        COALESCE(grade_level_info.name, '') || ')';
    END LOOP;
  END IF;
END $$;

