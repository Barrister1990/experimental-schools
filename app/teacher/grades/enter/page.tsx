'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useAlert } from '@/components/shared/AlertProvider';
import { useOfflineClasses, useOfflineStudents, useOfflineSubjects } from '@/hooks/useOfflineData';
import { offlineTeacherService } from '@/lib/services/offline-teacher-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getAcademicYearOptions } from '@/lib/utils/academic-years';
import { calculateGrade, getGradeColorClass } from '@/lib/utils/grading';
import { Class } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BookOpen, Calendar, ClipboardList, Filter, Info, Loader2, Save, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

// Updated schema: assessment fields are optional, but at least one must be provided
// Validation only checks max values when a number is entered
const gradeSchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  term: z.enum(['1', '2', '3'], { message: 'Term is required' }),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  studentId: z.string().min(1, 'Student is required'),
  project: z.union([
    z.number().min(0, 'Project score cannot be negative').max(40, 'Project score cannot exceed 40'),
    z.undefined()
  ]).optional(),
  test1: z.union([
    z.number().min(0, 'Test 1 score cannot be negative').max(20, 'Test 1 score cannot exceed 20'),
    z.undefined()
  ]).optional(),
  test2: z.union([
    z.number().min(0, 'Test 2 score cannot be negative').max(20, 'Test 2 score cannot exceed 20'),
    z.undefined()
  ]).optional(),
  groupWork: z.union([
    z.number().min(0, 'Group Work score cannot be negative').max(20, 'Group Work score cannot exceed 20'),
    z.undefined()
  ]).optional(),
  exam: z.union([
    z.number().min(0, 'Exam score cannot be negative').max(100, 'Exam score cannot exceed 100'),
    z.undefined()
  ]).optional(),
}).refine(
  (data) => {
    // At least one assessment must have a value > 0
    const project = data.project ?? 0;
    const test1 = data.test1 ?? 0;
    const test2 = data.test2 ?? 0;
    const groupWork = data.groupWork ?? 0;
    const exam = data.exam ?? 0;
    
    return project > 0 || test1 > 0 || test2 > 0 || groupWork > 0 || exam > 0;
  },
  {
    message: 'At least one assessment score must be entered',
    path: ['project'], // Show error on project field
  }
);

type GradeFormData = z.infer<typeof gradeSchema>;

interface ExistingGrade {
  project: number;
  test1: number;
  test2: number;
  groupWork: number;
  exam: number;
}

export default function EnterGradesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError, showSuccess, showWarning, showInfo } = useAlert();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [existingGrade, setExistingGrade] = useState<ExistingGrade | null>(null);
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ subjectId: string; classId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);

  // Use offline hooks for data loading
  const { classes, loading: classesLoading } = useOfflineClasses();
  const { students, loading: studentsLoading } = useOfflineStudents(selectedClass);
  const { subjects, loading: subjectsLoading } = useOfflineSubjects();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      academicYear: '2024/2025',
      term: '1',
      project: undefined,
      test1: undefined,
      test2: undefined,
      groupWork: undefined,
      exam: undefined,
    },
  });

  const watchedAcademicYear = watch('academicYear');
  const watchedTerm = watch('term');
  const watchedSubjectId = watch('subjectId');
  const watchedStudentId = watch('studentId');
  const watchedProject = watch('project') || 0;
  const watchedTest1 = watch('test1') || 0;
  const watchedTest2 = watch('test2') || 0;
  const watchedGroupWork = watch('groupWork') || 0;
  const watchedExam = watch('exam') || 0;

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Get teacher subject assignments (this determines what they can GRADE)
        const assignmentsRes = await fetch('/api/subject-assignments', { credentials: 'include' });
        if (!assignmentsRes.ok) {
          throw new Error('Failed to load assignments');
        }
        const allAssignments = await assignmentsRes.json();
        const teacherAssignments = Array.isArray(allAssignments)
          ? allAssignments.filter((a: any) => a.teacherId === user.id)
          : [];
        
        setSubjectAssignments(teacherAssignments.map((a: any) => ({
          subjectId: a.subjectId,
          classId: a.classId,
        })));

        // Filter classes: only classes where teacher teaches subjects
        const classIds = teacherAssignments.length > 0
          ? [...new Set(teacherAssignments.map((a: any) => a.classId))]
          : [];
        
        // Note: Classes, subjects, and students are now loaded via offline hooks
        // We just need to set the default class if teacher has only one class
        if (classIds.length === 1 && classes.length > 0) {
          const relevantClass = classes.find((c: Class) => c.id === classIds[0]);
          if (relevantClass) {
            setSelectedClass(relevantClass.id);
            setValue('classId', relevantClass.id);
          }
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, setValue]);

  // Load existing grade when student, subject, term, or academic year changes
  useEffect(() => {
    const loadExistingGrade = async () => {
      if (!watchedStudentId || !watchedSubjectId || !watchedTerm || !watchedAcademicYear) {
        setExistingGrade(null);
        // Reset form fields
        setValue('project', undefined);
        setValue('test1', undefined);
        setValue('test2', undefined);
        setValue('groupWork', undefined);
        setValue('exam', undefined);
        return;
      }

      setLoadingGrade(true);
      try {
        const gradeRes = await fetch(
          `/api/grades?studentId=${watchedStudentId}&subjectId=${watchedSubjectId}&term=${watchedTerm}&academicYear=${watchedAcademicYear}`,
          { credentials: 'include' }
        );

        if (gradeRes.ok) {
          const gradesData = await gradeRes.json();
          if (Array.isArray(gradesData) && gradesData.length > 0) {
            const existing = gradesData[0];
            const existingGrade: ExistingGrade = {
              project: existing.project || 0,
              test1: existing.test1 || 0,
              test2: existing.test2 || 0,
              groupWork: existing.groupWork || 0,
              exam: existing.exam || 0,
            };

            setExistingGrade(existingGrade);
            // Pre-fill form with existing values (only if > 0)
            setValue('project', existingGrade.project > 0 ? existingGrade.project : undefined);
            setValue('test1', existingGrade.test1 > 0 ? existingGrade.test1 : undefined);
            setValue('test2', existingGrade.test2 > 0 ? existingGrade.test2 : undefined);
            setValue('groupWork', existingGrade.groupWork > 0 ? existingGrade.groupWork : undefined);
            setValue('exam', existingGrade.exam > 0 ? existingGrade.exam : undefined);
          } else {
            setExistingGrade(null);
            // Reset form fields
            setValue('project', undefined);
            setValue('test1', undefined);
            setValue('test2', undefined);
            setValue('groupWork', undefined);
            setValue('exam', undefined);
          }
        } else {
          setExistingGrade(null);
        }
      } catch (error: any) {
        console.error('Failed to load existing grade:', error);
        setExistingGrade(null);
      } finally {
        setLoadingGrade(false);
      }
    };

    loadExistingGrade();
  }, [watchedStudentId, watchedSubjectId, watchedTerm, watchedAcademicYear, setValue]);

  // Calculate totals
  const calculateTotals = () => {
    // Class Score: 50% of (Project + Test1 + Test2 + Group Work)
    const classTotal = watchedProject + watchedTest1 + watchedTest2 + watchedGroupWork;
    const classMax = 40 + 20 + 20 + 20; // 100
    const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;

    // Exam Score: 50% of Exam
    const examScore = (watchedExam / 100) * 50;

    // Total Score
    const total = classScore + examScore;

    // Grade Letter using universal grading system
    const grade = calculateGrade(total);

    return {
      classScore: Math.round(classScore * 10) / 10,
      examScore: Math.round(examScore * 10) / 10,
      total: Math.round(total * 10) / 10,
      grade,
    };
  };

  const totals = calculateTotals();

  // Filter subjects based on selected class and teacher assignments
  const filteredSubjects = selectedClass
    ? subjects.filter((s) => 
        subjectAssignments.some((a) => a.subjectId === s.id && a.classId === selectedClass)
      )
    : subjects;

  const filteredStudents = selectedClass
    ? students.filter((s) => s.classId === selectedClass)
    : [];

  const onSubmit = async (data: GradeFormData) => {
    if (!user?.id || !selectedClass) {
      showWarning('Missing required information. Please try again.');
      return;
    }

    setSaving(true);
    try {
      const gradeData = {
        studentId: data.studentId,
        subjectId: data.subjectId,
        classId: selectedClass,
        teacherId: user.id,
        term: parseInt(data.term),
        academicYear: data.academicYear,
        project: data.project || 0,
        test1: data.test1 || 0,
        test2: data.test2 || 0,
        groupWork: data.groupWork || 0,
        exam: data.exam || 0,
      };

      // Use offline service - it handles online/offline automatically
      const result = await offlineTeacherService.saveGrade(gradeData);

      if (result.queued) {
        showInfo('Grades saved locally. They will sync when you\'re back online.');
      } else {
        showSuccess(existingGrade ? 'Grades updated successfully!' : 'Grades saved successfully!');
      }
      
      // Update existing grade state
      const updatedGrade: ExistingGrade = {
        project: gradeData.project,
        test1: gradeData.test1,
        test2: gradeData.test2,
        groupWork: gradeData.groupWork,
        exam: gradeData.exam,
      };
      setExistingGrade(updatedGrade);
      
      // Don't reset form, keep values for editing
    } catch (error: any) {
      console.error('Failed to save grades:', error);
      showError(error.message || 'Failed to save grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching grade entry data..." />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push('/teacher/grades')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Enter Grades</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Enter student grades incrementally - save and continue later
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 md:h-5 md:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs md:text-sm text-blue-800">
            <p className="font-semibold mb-1">Continuous Assessment Entry</p>
            <p className="mb-2">You can enter grades incrementally. Enter at least one assessment score and save. You can come back later to add or update other scores. Missing scores will be saved as 0.</p>
            <p className="font-semibold">Note:</p>
            <p>You can only enter grades for subjects you are assigned to teach. Class teachers can grade subjects they teach in their own class or in other classes. You can view all student grades, but grading is restricted to your assigned subjects.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Selection Panel */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Select Student</h2>
          
          {/* Filters */}
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Academic Year
              </label>
              <Controller
                name="academicYear"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                  >
                    {getAcademicYearOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Term
              </label>
              <Controller
                name="term"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                  >
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                )}
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Subject <span className="text-red-500">*</span>
              </label>
              <Controller
                name="subjectId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSelectedSubject(e.target.value);
                    }}
                    disabled={!selectedClass}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedClass ? 'Select subject' : 'Select class first'}</option>
                    {filteredSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.subjectId && (
                <p className="mt-1 text-xs text-red-600">{errors.subjectId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Class <span className="text-red-500">*</span>
              </label>
              <Controller
                name="classId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSelectedClass(e.target.value);
                      setSelectedStudent(''); // Reset student selection
                      setValue('studentId', '');
                    }}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.classId && (
                <p className="mt-1 text-xs text-red-600">{errors.classId.message}</p>
              )}
            </div>

            {selectedClass && (
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Student <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="studentId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedStudent(e.target.value);
                      }}
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    >
                      <option value="">Select student</option>
                      {filteredStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.firstName} {student.middleName || ''} {student.lastName} ({student.studentId})
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.studentId && (
                  <p className="mt-1 text-xs text-red-600">{errors.studentId.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grade Entry Form */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          {loadingGrade ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <TikTokLoader text="Loading existing grades..." />
            </div>
          ) : selectedStudent ? (
            <>
              <div className="mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">
                    {students.find((s) => s.id === selectedStudent)?.firstName}{' '}
                    {students.find((s) => s.id === selectedStudent)?.lastName}
                  </h2>
                  {existingGrade && (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      Existing Grades Found
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-gray-600">
                  {students.find((s) => s.id === selectedStudent)?.studentId} - {subjects.find((s) => s.id === selectedSubject)?.name}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                {/* Assessment Scores */}
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-4">Assessment Scores</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Enter at least one score. Leave empty if not yet assessed. Missing scores will be saved as 0.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Project <span className="text-gray-500">(Max: 40)</span>
                      </label>
                      <input
                        {...register('project', { 
                          valueAsNumber: true,
                          setValueAs: (v) => v === '' ? undefined : Number(v)
                        })}
                        type="number"
                        min="0"
                        max="40"
                        placeholder={existingGrade?.project ? existingGrade.project.toString() : 'Enter score'}
                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                      {errors.project && (
                        <p className="mt-1 text-xs text-red-600">{errors.project.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Test 1 <span className="text-gray-500">(Max: 20)</span>
                      </label>
                      <input
                        {...register('test1', { 
                          valueAsNumber: true,
                          setValueAs: (v) => v === '' ? undefined : Number(v)
                        })}
                        type="number"
                        min="0"
                        max="20"
                        placeholder={existingGrade?.test1 ? existingGrade.test1.toString() : 'Enter score'}
                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                      {errors.test1 && (
                        <p className="mt-1 text-xs text-red-600">{errors.test1.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Test 2 <span className="text-gray-500">(Max: 20)</span>
                      </label>
                      <input
                        {...register('test2', { 
                          valueAsNumber: true,
                          setValueAs: (v) => v === '' ? undefined : Number(v)
                        })}
                        type="number"
                        min="0"
                        max="20"
                        placeholder={existingGrade?.test2 ? existingGrade.test2.toString() : 'Enter score'}
                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                      {errors.test2 && (
                        <p className="mt-1 text-xs text-red-600">{errors.test2.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Group Work <span className="text-gray-500">(Max: 20)</span>
                      </label>
                      <input
                        {...register('groupWork', { 
                          valueAsNumber: true,
                          setValueAs: (v) => v === '' ? undefined : Number(v)
                        })}
                        type="number"
                        min="0"
                        max="20"
                        placeholder={existingGrade?.groupWork ? existingGrade.groupWork.toString() : 'Enter score'}
                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                      {errors.groupWork && (
                        <p className="mt-1 text-xs text-red-600">{errors.groupWork.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Exam <span className="text-gray-500">(Max: 100)</span>
                      </label>
                      <input
                        {...register('exam', { 
                          valueAsNumber: true,
                          setValueAs: (v) => v === '' ? undefined : Number(v)
                        })}
                        type="number"
                        min="0"
                        max="100"
                        placeholder={existingGrade?.exam ? existingGrade.exam.toString() : 'Enter score'}
                        className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      />
                      {errors.exam && (
                        <p className="mt-1 text-xs text-red-600">{errors.exam.message}</p>
                      )}
                    </div>
                  </div>
                  {errors.root && (
                    <p className="mt-2 text-xs text-red-600">{errors.root.message}</p>
                  )}
                </div>

                {/* Calculated Totals */}
                {(watchedProject > 0 || watchedTest1 > 0 || watchedTest2 > 0 || watchedGroupWork > 0 || watchedExam > 0) && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3">Calculated Totals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Class Score</p>
                        <p className="text-lg font-semibold text-gray-900">{totals.classScore.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">50% of class assessments</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Exam Score</p>
                        <p className="text-lg font-semibold text-gray-900">{totals.examScore.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">50% of exam</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Score</p>
                        <p className="text-lg font-semibold text-blue-600">{totals.total.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Grade</p>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getGradeColorClass(totals.grade)}`}>
                          {totals.grade}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setSelectedStudent('');
                      setExistingGrade(null);
                    }}
                    className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {existingGrade ? 'Update Grades' : 'Save Grades'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm md:text-base text-gray-600 mb-2">Select a student to enter grades</p>
              <p className="text-xs text-gray-500">Choose academic year, term, subject, class, and student from the left panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
