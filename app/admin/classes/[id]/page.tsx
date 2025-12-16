'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getLevelName, isHighestLevel } from '@/lib/utils/class-levels';
import { Class, Student, User } from '@/types';
import { ArrowLeft, Edit, GraduationCap, Plus, Trash2, Trophy, UserCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClassDetailsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useAlert();
  const params = useParams();
  const classId = params.id as string;
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classTeacher, setClassTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classRes, studentsRes] = await Promise.all([
          fetch(`/api/classes/${classId}`, { credentials: 'include' }),
          fetch(`/api/students?classId=${classId}`, { credentials: 'include' }),
        ]);

        if (!classRes.ok) {
          if (classRes.status === 404) {
            setClassInfo(null);
            setLoading(false);
            return;
          }
          const errorData = await classRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load class');
        }

        if (!studentsRes.ok) {
          const errorData = await studentsRes.json().catch(() => ({}));
          // Don't throw for empty students, just set empty array
          if (studentsRes.status !== 404) {
            console.warn('Failed to load students:', errorData.error);
          }
        }

        const [classData, studentsData] = await Promise.all([
          classRes.json(),
          studentsRes.ok ? studentsRes.json() : Promise.resolve([]),
        ]);

        setClassInfo(classData);
        // Handle empty array gracefully
        setStudents(Array.isArray(studentsData) ? studentsData : []);

        // Load class teacher information
        if (classData?.classTeacherId) {
          const teacherRes = await fetch(`/api/teachers/${classData.classTeacherId}`, { credentials: 'include' });
          if (teacherRes.ok) {
            const teacherData = await teacherRes.json();
            setClassTeacher(teacherData);
          }
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        // Only show alert for actual errors
        if (error.message && !error.message.includes('empty')) {
          showError(error.message || 'Failed to load class details. Please try again.');
        }
        // Set empty arrays on error to prevent UI issues
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      loadData();
    }
  }, [classId]);

  const handleDeleteClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation(); // Prevent row click
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete student');
      }

      // Remove student from local state
      setStudents(students.filter((s) => s.id !== studentToDelete.id));
      showSuccess(`Student ${studentToDelete.firstName} ${studentToDelete.lastName} has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);

      // Reload class info to update student count
      const classRes = await fetch(`/api/classes/${classId}`, { credentials: 'include' });
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassInfo(classData);
      }
    } catch (error: any) {
      console.error('Failed to delete student:', error);
      showError(error.message || 'Failed to delete student. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching class details..." />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Class not found</p>
          <button
            onClick={() => router.push('/admin/classes')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900 truncate">
            {classInfo.name}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Class Details</p>
        </div>
        <button
          onClick={() => router.push(`/admin/classes/${classInfo.id}/edit`)}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit Class</span>
        </button>
      </div>

      {/* Class Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Academic Year</p>
            <p className="text-sm md:text-base font-medium text-gray-900">{classInfo.academicYear}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Term</p>
            <p className="text-sm md:text-base font-medium text-gray-900">Term {classInfo.term}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Level</p>
            <p className="text-sm md:text-base font-medium text-gray-900">{getLevelName(classInfo.level)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Capacity</p>
            <p className="text-sm md:text-base font-medium text-gray-900">
              {classInfo.studentCount} / {classInfo.capacity}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Class Teacher
            </p>
            {classTeacher ? (
              <div>
                <p className="text-sm md:text-base font-medium text-gray-900">{classTeacher.name}</p>
                <p className="text-xs text-gray-500">{classTeacher.email}</p>
              </div>
            ) : (
              <p className="text-sm md:text-base text-gray-400">Not assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => router.push(`/admin/classes/${classId}/ranking`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Trophy className="h-5 w-5 text-yellow-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Class Ranking</h3>
            <p className="text-xs text-gray-600">View student rankings</p>
          </button>
          {isHighestLevel(classInfo.level) && (
            <button
              onClick={() => router.push(`/admin/classes/${classId}/graduation`)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <GraduationCap className="h-5 w-5 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">Graduate Class</h3>
              <p className="text-xs text-gray-600">Enter BECE results</p>
            </button>
          )}
          {!isHighestLevel(classInfo.level) && (
            <button
              onClick={() => router.push(`/admin/classes/${classId}/promote`)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <GraduationCap className="h-5 w-5 text-purple-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">Promote Students</h3>
              <p className="text-xs text-gray-600">Move to next class</p>
            </button>
          )}
        </div>
      </div>

      {/* Floating Student Grades Button */}
      <button
        onClick={() => router.push(`/admin/classes/${classId}/student-grades`)}
        className="fixed bottom-6 right-6 px-4 md:px-6 py-3 text-sm md:text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 z-20"
      >
        <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="hidden sm:inline">Student Grades</span>
      </button>

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Students</h2>
          <button
            onClick={() => router.push('/admin/students/new')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No students in this class</p>
            <button
              onClick={() => router.push('/admin/students/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Student ID
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/admin/students/${student.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs md:text-sm font-medium text-blue-600">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm md:text-base font-medium text-gray-900 truncate">
                            {student.firstName} {student.middleName || ''} {student.lastName}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {student.studentId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {student.studentId}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' :
                        student.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => handleDeleteClick(e, student)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete student"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {studentToDelete?.firstName} {studentToDelete?.middleName || ''} {studentToDelete?.lastName}
              </strong>
              ? This action cannot be undone and will permanently delete all records associated with this student,
              including grades, attendance, and evaluations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

