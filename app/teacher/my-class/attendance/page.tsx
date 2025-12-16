'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useAlert } from '@/components/shared/AlertProvider';
import { useOfflineClasses, useOfflineStudents } from '@/hooks/useOfflineData';
import { Attendance } from '@/lib/services/attendance-service';
import { offlineTeacherService } from '@/lib/services/offline-teacher-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/utils/academic-years';
import { Class, Student } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const attendanceSchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  term: z.enum(['1', '2', '3'], { message: 'Term is required' }),
  totalDays: z.number().min(1, 'Total days must be at least 1'),
  daysPresent: z.number().min(0, 'Days present must be 0 or greater'),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError, showSuccess, showInfo } = useAlert();
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [universalTotalDays, setUniversalTotalDays] = useState<number>(0);

  // Use offline hooks for data loading
  const { classes: teacherClasses, loading: classesLoading } = useOfflineClasses(user?.id);
  const { students, loading: studentsLoading } = useOfflineStudents(classInfo?.id);

  useEffect(() => {
    if (!user?.id) return;

    // Set class info from offline classes
    if (teacherClasses && teacherClasses.length > 0) {
      setClassInfo(teacherClasses[0]);
    }

    const loadAttendanceRecords = async () => {
      if (!classInfo) return;

      try {
        const attendanceRes = await fetch(
          `/api/attendance?classId=${classInfo.id}&term=${selectedTerm}&academicYear=${selectedAcademicYear}`,
          { credentials: 'include' }
        );
        
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          const records: Record<string, Attendance> = {};
          
          // Find the most common totalDays value (universal total days)
          const totalDaysCounts: Record<number, number> = {};
          attendanceData.forEach((att: Attendance) => {
            if (att.totalDays > 0) {
              totalDaysCounts[att.totalDays] = (totalDaysCounts[att.totalDays] || 0) + 1;
            }
          });
          
          // Get the most common totalDays value
          let mostCommonTotalDays = 0;
          let maxCount = 0;
          Object.entries(totalDaysCounts).forEach(([days, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonTotalDays = parseInt(days);
            }
          });
          
          // Set universal total days if found
          if (mostCommonTotalDays > 0) {
            setUniversalTotalDays(mostCommonTotalDays);
          }
          
          attendanceData.forEach((att: Attendance) => {
            records[att.studentId] = att;
          });
          
          // Initialize empty records for students without attendance
          students.forEach((student: Student) => {
            if (!records[student.id]) {
              records[student.id] = {
                id: '',
                studentId: student.id,
                academicYear: selectedAcademicYear,
                term: parseInt(selectedTerm),
                totalDays: mostCommonTotalDays || 0,
                presentDays: 0,
                absentDays: 0,
                lateDays: 0,
                excusedDays: 0,
                attendancePercentage: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            }
          });
          setAttendanceRecords(records);
        } else {
          // Initialize empty records
          const records: Record<string, Attendance> = {};
          students.forEach((student: Student) => {
            records[student.id] = {
              id: '',
              studentId: student.id,
              academicYear: selectedAcademicYear,
              term: parseInt(selectedTerm),
              totalDays: 0,
              presentDays: 0,
              absentDays: 0,
              lateDays: 0,
              excusedDays: 0,
              attendancePercentage: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });
          setAttendanceRecords(records);
        }
      } catch (error) {
        console.warn('Failed to load attendance records, will use cached data:', error);
      }
    };

    if (classInfo) {
      loadAttendanceRecords();
    }

    setLoading(classesLoading || studentsLoading);
  }, [user?.id, teacherClasses, classInfo, students, selectedTerm, selectedAcademicYear, classesLoading, studentsLoading]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      academicYear: selectedAcademicYear,
      term: selectedTerm as '1' | '2' | '3',
      totalDays: universalTotalDays,
      daysPresent: 0,
    },
  });

  // Update form when universal total days changes
  useEffect(() => {
    if (universalTotalDays > 0) {
      setValue('totalDays', universalTotalDays);
    }
  }, [universalTotalDays, setValue]);

  // Auto-calculate absent days when present days or total days change
  const watchedTotalDays = watch('totalDays') || 0;
  const watchedPresentDays = watch('daysPresent') || 0;
  const calculatedAbsentDays = Math.max(0, watchedTotalDays - watchedPresentDays);

  const handleStudentClick = (studentId: string) => {
    setSelectedStudent(studentId);
    const record = attendanceRecords[studentId];
    const totalDaysToUse = universalTotalDays > 0 ? universalTotalDays : (record?.totalDays || 0);
    
    if (record) {
      reset({
        academicYear: record.academicYear,
        term: record.term.toString() as '1' | '2' | '3',
        totalDays: totalDaysToUse,
        daysPresent: record.presentDays,
      });
    } else {
      reset({
        academicYear: selectedAcademicYear,
        term: selectedTerm as '1' | '2' | '3',
        totalDays: totalDaysToUse,
        daysPresent: 0,
      });
    }
  };

  const onSubmit = async (data: AttendanceFormData) => {
    if (!selectedStudent || !classInfo) return;

    setSaving(true);
    try {
      // Calculate absent days automatically
      const absentDays = Math.max(0, data.totalDays - data.daysPresent);
      
      // Update universal total days if it's different
      if (data.totalDays !== universalTotalDays && data.totalDays > 0) {
        setUniversalTotalDays(data.totalDays);
      }

      const attendanceData = {
        studentId: selectedStudent,
        classId: classInfo.id,
        term: parseInt(data.term),
        academicYear: data.academicYear,
        totalDays: data.totalDays,
        presentDays: data.daysPresent,
        absentDays: absentDays,
        lateDays: 0,
        excusedDays: 0,
        date: new Date().toISOString().split('T')[0], // Today's date
      };

      // Use offline service - it handles online/offline automatically
      const result = await offlineTeacherService.saveAttendance(attendanceData);

      // Update local state
      const attendanceRecord: Attendance = {
        ...attendanceData,
        id: result.id || `temp-${Date.now()}`,
        attendancePercentage: (data.daysPresent / data.totalDays) * 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAttendanceRecords({
        ...attendanceRecords,
        [selectedStudent]: attendanceRecord,
      });

      if (result.queued) {
        showInfo('Attendance saved locally. It will sync when you\'re back online.');
      } else {
        showSuccess('Attendance saved successfully!');
      }
      
      setSelectedStudent(null);
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      showError(error.message || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAttendancePercentage = (record: Attendance | undefined) => {
    if (!record) return 0;
    return Math.round(record.attendancePercentage);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching attendance data..." />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
            No Class Assigned
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            You don't have a class assigned yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push('/teacher/my-class')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Record attendance summary for {classInfo.name}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Universal Total Days <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={universalTotalDays}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setUniversalTotalDays(value);
                if (selectedStudent) {
                  setValue('totalDays', value);
                }
              }}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="Set for all students"
            />
            <p className="mt-1 text-xs text-gray-500">Applies to all students in the class</p>
          </div>
          <div className="flex items-end">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Set total days once, then enter present days for each student. Absent days will be calculated automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Students List */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">
              Students ({students.length})
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {students.map((student) => {
              const record = attendanceRecords[student.id];
              const percentage = getAttendancePercentage(record);
              const isSelected = selectedStudent === student.id;

              return (
                <button
                  key={student.id}
                  onClick={() => handleStudentClick(student.id)}
                  className={`w-full p-3 md:p-4 border-b border-gray-200 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs md:text-sm font-medium text-gray-900">
                      {student.firstName} {student.middleName || ''} {student.lastName}
                    </p>
                    {record && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        percentage >= 80 ? 'bg-green-100 text-green-800' :
                        percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {percentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-600">{student.studentId}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Attendance Form */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          {selectedStudent ? (
            <>
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                  {students.find((s) => s.id === selectedStudent)?.firstName}{' '}
                  {students.find((s) => s.id === selectedStudent)?.lastName}
                </h2>
                <p className="text-xs md:text-sm text-gray-600">
                  {students.find((s) => s.id === selectedStudent)?.studentId}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Total Days <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('totalDays', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-50"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">Set in the filter section above (applies to all students)</p>
                    {errors.totalDays && (
                      <p className="mt-1 text-xs text-red-600">{errors.totalDays.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Days Present <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('daysPresent', { 
                        valueAsNumber: true,
                        max: {
                          value: watchedTotalDays,
                          message: `Days present cannot exceed total days (${watchedTotalDays})`
                        }
                      })}
                      type="number"
                      min="0"
                      max={watchedTotalDays}
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                    {errors.daysPresent && (
                      <p className="mt-1 text-xs text-red-600">{errors.daysPresent.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Days Absent (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      value={calculatedAbsentDays}
                      readOnly
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm md:text-base"
                    />
                    <p className="mt-1 text-xs text-gray-500">Automatically calculated: Total Days - Days Present</p>
                  </div>
                </div>

                {/* Summary */}
                {(() => {
                  const total = watchedTotalDays;
                  const present = watchedPresentDays;
                  const absent = calculatedAbsentDays;
                  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                  return (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-3">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                          <p className="text-[10px] md:text-xs text-gray-600">Total Days</p>
                          <p className="text-sm md:text-base font-semibold text-gray-900">{total}</p>
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-gray-600">Present</p>
                          <p className="text-sm md:text-base font-semibold text-green-600">{present}</p>
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-gray-600">Absent</p>
                          <p className="text-sm md:text-base font-semibold text-red-600">{absent}</p>
                        </div>
                        <div className="md:col-span-3">
                          <p className="text-[10px] md:text-xs text-gray-600">Attendance Rate</p>
                          <p className={`text-lg md:text-xl font-semibold ${
                            percentage >= 80 ? 'text-green-600' :
                            percentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {percentage}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Attendance
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <UserCheck className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm md:text-base text-gray-600 mb-2">Select a student to record attendance</p>
              <p className="text-xs text-gray-500">Click on a student from the list to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

