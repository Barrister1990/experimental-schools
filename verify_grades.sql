-- ============================================
-- VERIFY GRADES - Check if grades are correct
-- ============================================

-- Check if grade column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'grades' 
  AND column_name = 'grade';

-- Check active grading system and its ranges
SELECT 
  gs.name as system_name,
  gl.code,
  gl.name,
  gl.min_percentage,
  gl.max_percentage,
  gl.order_index
FROM public.grading_system gs
JOIN public.grade_levels gl ON gl.grading_system_id = gs.id
WHERE gs.is_active = true
ORDER BY gl.order_index DESC;

-- Check a specific example: Find grades around 79.5%
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
FROM public.grades g
JOIN public.students s ON g.student_id = s.id
JOIN public.subjects sub ON g.subject_id = sub.id
WHERE ABS(calculate_total_percentage(g.project, g.test1, g.test2, g.group_work, g.exam) - 79.5) < 1
LIMIT 10;

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'grades'
  AND trigger_name = 'trigger_update_grade_on_score_change';

