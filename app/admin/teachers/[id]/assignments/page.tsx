'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, School, BookOpen, Plus, X } from 'lucide-react';
import { User, Class, Subject } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

interface SubjectAssignment {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

export default function TeacherAssignmentsViewPage() {
  const router = useRouter();
  const { showError, showWarning, showSuccess } = useAlert();
  const params = useParams();
  const teacherId = params.id as string;
  const [teacher, setTeacher] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load teacher data
        const teacherRes = await fetch(`/api/teachers/${teacherId}`, { credentials: 'include' });
        if (!teacherRes.ok) {
          throw new Error('Failed to load teacher');
        }
        const teacherData = await teacherRes.json();
        
        if (teacherData) {
          setTeacher(teacherData);
        } else {
          setLoading(false);
          return;
        }

        // Load classes and subjects
        const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
          fetch('/api/classes', { credentials: 'include' }),
          fetch('/api/subjects', { credentials: 'include' }),
          fetch('/api/subject-assignments', { credentials: 'include' }),
        ]);

        let classesData: Class[] = [];
        let subjectsData: Subject[] = [];
        let assignmentsData: any[] = [];

        if (classesRes.ok) {
          classesData = await classesRes.json();
          setClasses(Array.isArray(classesData) ? classesData : []);
        }

        if (subjectsRes.ok) {
          subjectsData = await subjectsRes.json();
          setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        }

        if (assignmentsRes.ok) {
          assignmentsData = await assignmentsRes.json();
        }

        // Find assigned class if teacher is a class teacher
        if (teacherData.isClassTeacher) {
          const classItem = Array.isArray(classesData) 
            ? classesData.find((c) => c.classTeacherId === teacherData.id)
            : null;
          if (classItem) {
            setAssignedClass(classItem);
          }
        }

        // Load subject assignments for this teacher
        const teacherAssignments = Array.isArray(assignmentsData)
          ? assignmentsData.filter((a: any) => a.teacherId === teacherData.id)
          : [];

        const subjectAssignmentsList: SubjectAssignment[] = teacherAssignments.map((assignment: any) => {
          const subject = Array.isArray(subjectsData) 
            ? subjectsData.find((s) => s.id === assignment.subjectId)
            : null;
          const classItem = Array.isArray(classesData)
            ? classesData.find((c) => c.id === assignment.classId)
            : null;
          
          return {
            subjectId: assignment.subjectId,
            subjectName: subject?.name || 'Unknown',
            classId: assignment.classId,
            className: classItem?.name || 'Unknown',
          };
        });

        setSubjectAssignments(subjectAssignmentsList);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) {
      loadData();
    }
  }, [teacherId]);

  const addSubjectAssignment = async () => {
    if (!selectedClass || !selectedSubject || !teacher) {
      showWarning('Please select both class and subject');
      return;
    }

    const subject = subjects.find((s) => s.id === selectedSubject);
    const classItem = classes.find((c) => c.id === selectedClass);

    if (!subject || !classItem) return;

    // Check if assignment already exists
    const exists = subjectAssignments.some(
      (a) => a.subjectId === selectedSubject && a.classId === selectedClass
    );

    if (exists) {
      showWarning('This subject is already assigned to this class');
      return;
    }

    try {
      // Create assignment in Supabase
      const res = await fetch('/api/subject-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: teacher.id,
          subjectId: selectedSubject,
          classId: selectedClass,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create assignment');
      }

      // Update local state
      setSubjectAssignments([
        ...subjectAssignments,
        {
          subjectId: selectedSubject,
          subjectName: subject.name,
          classId: selectedClass,
          className: classItem.name,
        },
      ]);

      setSelectedClass('');
      setSelectedSubject('');
    } catch (error: any) {
      console.error('Failed to add assignment:', error);
      showError(error.message || 'Failed to add assignment. Please try again.');
    }
  };

  const removeSubjectAssignment = async (subjectId: string, classId: string) => {
    if (!teacher) return;

    try {
      // Delete assignment from Supabase
      const res = await fetch('/api/subject-assignments/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: teacher.id,
          subjectId,
          classId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove assignment');
      }

      // Update local state
      setSubjectAssignments(
        subjectAssignments.filter(
          (a) => !(a.subjectId === subjectId && a.classId === classId)
        )
      );
    } catch (error: any) {
      console.error('Failed to remove assignment:', error);
      showError(error.message || 'Failed to remove assignment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching assignments..." />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Teacher not found</p>
          <button
            onClick={() => router.push('/admin/teachers')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Teachers
          </button>
        </div>
      </div>
    );
  }

  const isClassTeacher = teacher.isClassTeacher === true;
  const isSubjectTeacher = teacher.isSubjectTeacher === true;

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
            {teacher.name || 'Teacher'} - Assignments
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Manage class and subject assignments</p>
        </div>
      </div>

      {/* Class Assignment (for Class Teachers) */}
      {isClassTeacher && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <School className="h-5 w-5 text-green-600" />
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Class Assignment</h2>
          </div>
          {assignedClass ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{assignedClass.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {assignedClass.level} • {assignedClass.term} Term
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                Assigned
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No class assigned</p>
          )}
        </div>
      )}

      {/* Subject Assignments (for Subject Teachers) */}
      {isSubjectTeacher && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Subject Assignments</h2>
            </div>
          </div>

          {/* Add Subject Assignment */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addSubjectAssignment}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Assignment
                </button>
              </div>
            </div>
          </div>

          {/* Subject Assignments List */}
          {subjectAssignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No subject assignments</p>
          ) : (
            <div className="space-y-2">
              {subjectAssignments.map((assignment, index) => (
                <div
                  key={`${assignment.subjectId}-${assignment.classId}-${index}`}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{assignment.subjectName}</p>
                    <p className="text-xs text-gray-600 mt-1">{assignment.className}</p>
                  </div>
                  <button
                    onClick={() => removeSubjectAssignment(assignment.subjectId, assignment.classId)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info for teachers with both roles */}
      {isClassTeacher && isSubjectTeacher && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This teacher has both class teacher and subject teacher roles. They can manage their assigned class and teach multiple subjects across different classes.
          </p>
        </div>
      )}

      {/* Info for teachers with no assignments */}
      {!isClassTeacher && !isSubjectTeacher && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">This teacher has no role assignments.</p>
        </div>
      )}
    </div>
  );
}

