-- ============================================
-- DIAGNOSE AND FIX GRADES
-- This script checks the current state and fixes any issues
-- ============================================

-- Step 1: Check if grade column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grades' 
    AND column_name = 'grade'
  ) THEN
    RAISE NOTICE 'Grade column does not exist. Adding it now...';
    ALTER TABLE public.grades ADD COLUMN grade TEXT;
  ELSE
    RAISE NOTICE 'Grade column exists.';
  END IF;
END $$;

-- Step 2: Check active grading system
DO $$
DECLARE
  active_system_name TEXT;
  found_record BOOLEAN := FALSE;
BEGIN
  SELECT name INTO active_system_name
  FROM public.grading_system
  WHERE is_active = true
  LIMIT 1;
  
  found_record := FOUND;
  
  IF NOT found_record OR active_system_name IS NULL THEN
    RAISE NOTICE 'WARNING: No active grading system found!';
  ELSE
    RAISE NOTICE 'Active Grading System: %', active_system_name;
  END IF;
END $$;

DO $$
DECLARE
  grade_count INTEGER;
  null_grade_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO grade_count FROM public.grades;
  SELECT COUNT(*) INTO null_grade_count FROM public.grades WHERE grade IS NULL;
  
  RAISE NOTICE 'Total grades: %', grade_count;
  RAISE NOTICE 'Grades with NULL grade column: %', null_grade_count;
END $$;

-- Step 3: Check a specific example (79.5%)
DO $$
DECLARE
  example_record RECORD;
BEGIN
  SELECT 
    g.id,
    s.first_name || ' ' || s.last_name as student_name,
    sub.name as subject_name,
    g.project,
    g.test1,
    g.test2,
    g.group_work,
    g.exam,
    calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) as calculated_total,
    g.grade as database_grade,
    calculate_grade_from_percentage(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam)) as should_be_grade
  INTO example_record
  FROM public.grades g
  JOIN public.students s ON g.student_id = s.id
  JOIN public.subjects sub ON g.subject_id = sub.id
  WHERE ABS(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) - 79.5) < 1
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Example Record (79.5%%):';
    RAISE NOTICE '  Student: %', example_record.student_name;
    RAISE NOTICE '  Subject: %', example_record.subject_name;
    RAISE NOTICE '  Scores: Project=%, Test1=%, Test2=%, GroupWork=%, Exam=%', 
      example_record.project, example_record.test1, example_record.test2, 
      example_record.group_work, example_record.exam;
    RAISE NOTICE '  Calculated Total: %', example_record.calculated_total;
    RAISE NOTICE '  Database Grade: %', example_record.database_grade;
    RAISE NOTICE '  Should Be Grade: %', example_record.should_be_grade;
    
    IF example_record.database_grade IS NULL THEN
      RAISE NOTICE '  PROBLEM: Database grade is NULL!';
    ELSIF example_record.database_grade != example_record.should_be_grade THEN
      RAISE NOTICE '  PROBLEM: Database grade (%) does not match expected grade (%)!', 
        example_record.database_grade, example_record.should_be_grade;
    ELSE
      RAISE NOTICE '  OK: Database grade matches expected grade';
    END IF;
  ELSE
    RAISE NOTICE 'No record found with 79.5%% total';
  END IF;
END $$;

-- Step 4: Recalculate ALL grades to ensure they're correct
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
  RAISE NOTICE 'Updated % grade records', updated_count;
END $$;

-- Step 5: Verify the fix
DO $$
DECLARE
  example_record RECORD;
BEGIN
  
  -- Check the example again
  SELECT 
    g.id,
    s.first_name || ' ' || s.last_name as student_name,
    sub.name as subject_name,
    calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) as calculated_total,
    g.grade as database_grade,
    calculate_grade_from_percentage(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam)) as should_be_grade
  INTO example_record
  FROM public.grades g
  JOIN public.students s ON g.student_id = s.id
  JOIN public.subjects sub ON g.subject_id = sub.id
  WHERE ABS(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) - 79.5) < 1
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '';
    RAISE NOTICE 'After Update - Example Record (79.5%%):';
    RAISE NOTICE '  Calculated Total: %', example_record.calculated_total;
    RAISE NOTICE '  Database Grade: %', example_record.database_grade;
    RAISE NOTICE '  Should Be Grade: %', example_record.should_be_grade;
    
    IF example_record.database_grade = example_record.should_be_grade THEN
      RAISE NOTICE '  SUCCESS: Grades are now correct!';
    ELSE
      RAISE NOTICE '  ERROR: Grades still do not match!';
    END IF;
  END IF;
END $$;

