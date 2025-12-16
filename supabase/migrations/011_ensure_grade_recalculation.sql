-- ============================================
-- ENSURE GRADE RECALCULATION ON UPDATE
-- This migration ensures grades are always recalculated correctly
-- ============================================

-- Create a function to recalculate grade for a specific record
CREATE OR REPLACE FUNCTION recalculate_grade_for_record(grade_id UUID)
RETURNS VOID AS $$
DECLARE
  total_perc NUMERIC;
  calculated_grade TEXT;
BEGIN
  -- Calculate total percentage
  SELECT calculate_total_percentage(
    project,
    test1,
    test2,
    group_work,
    exam
  ) INTO total_perc
  FROM public.grades
  WHERE id = grade_id;
  
  -- Calculate grade
  calculated_grade := calculate_grade_from_percentage(total_perc);
  
  -- Update the grade column
  UPDATE public.grades
  SET grade = calculated_grade
  WHERE id = grade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is correct
DROP TRIGGER IF EXISTS trigger_update_grade_on_score_change ON public.grades;

CREATE TRIGGER trigger_update_grade_on_score_change
  BEFORE INSERT OR UPDATE OF project, test1, test2, group_work, exam
  ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION update_grade_on_score_change();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_grade_for_record(UUID) TO authenticated;

