/**
 * Grade Service
 * Handles all grade-related operations with Supabase
 */

import { formatError } from '@/lib/utils/error-formatter';
import { calculateGrade } from '@/lib/utils/grading';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  term: number;
  academicYear: string;
  project: number;
  test1: number;
  test2: number;
  groupWork: number;
  exam: number;
  grade?: string; // Database-calculated grade (added by migration)
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGradeData {
  studentId: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  term: number;
  academicYear: string;
  project?: number;
  test1?: number;
  test2?: number;
  groupWork?: number;
  exam?: number;
}

export interface UpdateGradeData extends Partial<CreateGradeData> {
  id: string;
}

export interface GradeWithDetails extends Grade {
  studentName?: string;
  subjectName?: string;
  className?: string;
  classScore?: number;
  examScore?: number;
  total?: number;
  grade?: string;
}

class GradeService {
  /**
   * Map database row to Grade type
   */
  private mapDbToGrade(row: any): Grade {
    return {
      id: row.id,
      studentId: row.student_id,
      subjectId: row.subject_id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      term: row.term,
      academicYear: row.academic_year,
      project: parseFloat(row.project || '0'),
      test1: parseFloat(row.test1 || '0'),
      test2: parseFloat(row.test2 || '0'),
      groupWork: parseFloat(row.group_work || '0'),
      exam: parseFloat(row.exam || '0'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // Include database grade column if it exists (added by migration)
      grade: row.grade || undefined,
    };
  }

  /**
   * Calculate class score, exam score, total, and grade
   * Uses database grade if available (from migration), otherwise calculates it
   */
  private calculateGradeDetails(grade: Grade) {
    // Class Score: 50% of (Project + Test1 + Test2 + Group Work)
    const classTotal = grade.project + grade.test1 + grade.test2 + grade.groupWork;
    const classMax = 40 + 20 + 20 + 20; // 100
    const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;

    // Exam Score: 50% of Exam
    const examScore = (grade.exam / 100) * 50;

    // Total Score
    const total = classScore + examScore;

    // Use database grade if available (calculated by SQL trigger), otherwise calculate it
    const gradeLetter = grade.grade || calculateGrade(total);

    return {
      classScore: Math.round(classScore * 10) / 10,
      examScore: Math.round(examScore * 10) / 10,
      total: Math.round(total * 10) / 10,
      grade: gradeLetter,
    };
  }

  /**
   * Get grades with optional filters
   */
  async getGrades(
    supabase: SupabaseClient,
    filters?: {
      studentId?: string;
      subjectId?: string;
      classId?: string;
      teacherId?: string;
      term?: number;
      academicYear?: string;
    }
  ): Promise<Grade[]> {
    try {
      let query = supabase
        .from('grades')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      if (filters?.teacherId) {
        query = query.eq('teacher_id', filters.teacherId);
      }
      if (filters?.term) {
        query = query.eq('term', filters.term);
      }
      if (filters?.academicYear) {
        query = query.eq('academic_year', filters.academicYear);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row) => this.mapDbToGrade(row));
    } catch (error: any) {
      console.error('Error fetching grades:', error);
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return [];
      }
      throw new Error(formatError(error));
    }
  }

  /**
   * Get grades with student, subject, and class details
   */
  async getGradesWithDetails(
    supabase: SupabaseClient,
    filters?: {
      studentId?: string;
      subjectId?: string;
      classId?: string;
      teacherId?: string;
      term?: number;
      academicYear?: string;
    }
  ): Promise<GradeWithDetails[]> {
    try {
      const grades = await this.getGrades(supabase, filters);

      if (grades.length === 0) {
        return [];
      }

      // Get unique IDs
      const studentIds = [...new Set(grades.map((g) => g.studentId))];
      const subjectIds = [...new Set(grades.map((g) => g.subjectId))];
      const classIds = [...new Set(grades.map((g) => g.classId))];

      // Fetch related data
      const [studentsRes, subjectsRes, classesRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name').in('id', studentIds),
        supabase.from('subjects').select('id, name').in('id', subjectIds),
        supabase.from('classes').select('id, name').in('id', classIds),
      ]);

      const students = studentsRes.data || [];
      const subjects = subjectsRes.data || [];
      const classes = classesRes.data || [];

      // Map grades with details
      return grades.map((grade) => {
        const student = students.find((s) => s.id === grade.studentId);
        const subject = subjects.find((s) => s.id === grade.subjectId);
        const classData = classes.find((c) => c.id === grade.classId);
        const details = this.calculateGradeDetails(grade);

        return {
          ...grade,
          studentName: student ? `${student.first_name} ${student.last_name}` : undefined,
          subjectName: subject?.name,
          className: classData?.name,
          ...details,
          // Prioritize database grade over calculated grade
          grade: grade.grade || details.grade,
        };
      });
    } catch (error: any) {
      console.error('Error fetching grades with details:', error);
      throw new Error(formatError(error));
    }
  }

  /**
   * Get a single grade
   */
  async getGrade(
    supabase: SupabaseClient,
    studentId: string,
    subjectId: string,
    term: number,
    academicYear: string
  ): Promise<Grade | null> {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('term', term)
        .eq('academic_year', academicYear)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data ? this.mapDbToGrade(data) : null;
    } catch (error: any) {
      console.error('Error fetching grade:', error);
      throw new Error(formatError(error));
    }
  }

  /**
   * Create or update grade (upsert)
   */
  async upsertGrade(supabase: SupabaseClient, gradeData: CreateGradeData): Promise<Grade> {
    try {
      // Check if grade exists
      const existing = await this.getGrade(
        supabase,
        gradeData.studentId,
        gradeData.subjectId,
        gradeData.term,
        gradeData.academicYear
      );

      const gradePayload = {
        student_id: gradeData.studentId,
        subject_id: gradeData.subjectId,
        class_id: gradeData.classId,
        teacher_id: gradeData.teacherId,
        term: gradeData.term,
        academic_year: gradeData.academicYear,
        project: gradeData.project ?? 0,
        test1: gradeData.test1 ?? 0,
        test2: gradeData.test2 ?? 0,
        group_work: gradeData.groupWork ?? 0,
        exam: gradeData.exam ?? 0,
      };

      if (existing) {
        // Update existing
        // First update the scores (this should trigger the database trigger)
        const { error: updateError } = await supabase
          .from('grades')
          .update(gradePayload)
          .eq('id', existing.id);

        if (updateError) throw updateError;

        // Explicitly recalculate the grade using RPC function
        // This ensures the grade is correct even if the trigger doesn't fire
        const { error: rpcError } = await supabase.rpc('recalculate_grade_for_record', {
          grade_id: existing.id
        });

        // Log warning if RPC fails (trigger should still work)
        if (rpcError) {
          console.warn('Could not explicitly recalculate grade via RPC, relying on trigger:', rpcError);
        }

        // Fetch the updated record (should have correct grade from trigger or RPC)
        const { data, error: fetchError } = await supabase
          .from('grades')
          .select()
          .eq('id', existing.id)
          .single();

        if (fetchError) throw fetchError;
        return this.mapDbToGrade(data);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('grades')
          .insert(gradePayload)
          .select()
          .single();

        if (error) throw error;
        
        // For new records, explicitly recalculate grade if trigger didn't set it
        if (!data.grade) {
          const { error: rpcError } = await supabase.rpc('recalculate_grade_for_record', {
            grade_id: data.id
          });

          if (!rpcError) {
            // Fetch again to get the calculated grade
            const { data: updatedData } = await supabase
              .from('grades')
              .select()
              .eq('id', data.id)
              .single();
            
            if (updatedData) {
              return this.mapDbToGrade(updatedData);
            }
          }
        }
        
        return this.mapDbToGrade(data);
      }
    } catch (error: any) {
      console.error('Error upserting grade:', error);
      throw new Error(formatError(error));
    }
  }

  /**
   * Delete grade
   */
  async deleteGrade(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting grade:', error);
      throw new Error(formatError(error));
    }
  }
}

export const gradeService = new GradeService();

