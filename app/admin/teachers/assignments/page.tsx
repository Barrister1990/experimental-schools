'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck, School, BookOpen, Plus, MoreVertical, X, Save, Loader2 } from 'lucide-react';
import { User, Class, Subject } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

interface SubjectAssignment {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
}

interface TeacherAssignment {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  classId?: string;
  className?: string;
  subjectAssignments: SubjectAssignment[];
}

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const { showError, showWarning, showSuccess } = useAlert();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachersRes, classesRes, subjectsRes, assignmentsRes] = await Promise.all([
          fetch('/api/teachers', { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
          fetch('/api/subjects', { credentials: 'include' }),
          fetch('/api/subject-assignments', { credentials: 'include' }),
        ]);

        if (!teachersRes.ok || !classesRes.ok || !subjectsRes.ok || !assignmentsRes.ok) {
          throw new Error('Failed to load data');
        }

        const [teachersData, classesData, subjectsData, assignmentsData] = await Promise.all([
          teachersRes.json(),
          classesRes.json(),
          subjectsRes.json(),
          assignmentsRes.json(),
        ]);

        setTeachers(Array.isArray(teachersData) ? teachersData : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);

        // Build assignments with actual data
        const teacherAssignments: TeacherAssignment[] = teachersData.map((teacher: User) => {
          const isClassTeacher = teacher.isClassTeacher || false;
          const isSubjectTeacher = teacher.isSubjectTeacher || false;
          
          // Find class where this teacher is class teacher
          const assignedClass = classesData.find((c: Class) => c.classTeacherId === teacher.id);

          // Get subject assignments for this teacher
          const teacherSubjectAssignments = assignmentsData
            .filter((assignment: any) => assignment.teacherId === teacher.id)
            .map((assignment: any) => {
              const subject = subjectsData.find((s: Subject) => s.id === assignment.subjectId);
              const classItem = classesData.find((c: Class) => c.id === assignment.classId);
              return {
                subjectId: assignment.subjectId,
                subjectName: subject?.name || 'Unknown',
                classId: assignment.classId,
                className: classItem?.name || 'Unknown',
              };
            });

          return {
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email,
            isClassTeacher,
            isSubjectTeacher,
            classId: assignedClass?.id,
            className: assignedClass?.name,
            subjectAssignments: teacherSubjectAssignments,
          };
        });

        setAssignments(teacherAssignments);
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const addSubjectAssignment = async (teacherId: string) => {
    if (!selectedClass || !selectedSubject) {
      showWarning('Please select both class and subject');
      return;
    }

    const subject = subjects.find((s) => s.id === selectedSubject);
    const classItem = classes.find((c) => c.id === selectedClass);

    if (!subject || !classItem) return;

    // Check if assignment already exists
    const assignment = assignments.find((a) => a.teacherId === teacherId);
    const exists = assignment?.subjectAssignments.some(
      (sa) => sa.subjectId === selectedSubject && sa.classId === selectedClass
    );
    if (exists) {
      showWarning('This subject is already assigned to this class for this teacher');
      return;
    }

    try {
      const res = await fetch('/api/subject-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId,
          subjectId: selectedSubject,
          classId: selectedClass,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add assignment');
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) => {
          if (assignment.teacherId === teacherId) {
            return {
              ...assignment,
              subjectAssignments: [
                ...assignment.subjectAssignments,
                {
                  subjectId: selectedSubject,
                  subjectName: subject.name,
                  classId: selectedClass,
                  className: classItem.name,
                },
              ],
            };
          }
          return assignment;
        })
      );

      setSelectedClass('');
      setSelectedSubject('');
    } catch (error: any) {
      console.error('Failed to add assignment:', error);
      showError(error.message || 'Failed to add assignment. Please try again.');
    }
  };

  const removeSubjectAssignment = async (teacherId: string, subjectId: string, classId: string) => {
    try {
      const res = await fetch(
        `/api/subject-assignments/delete?teacherId=${teacherId}&subjectId=${subjectId}&classId=${classId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove assignment');
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) => {
          if (assignment.teacherId === teacherId) {
            return {
              ...assignment,
              subjectAssignments: assignment.subjectAssignments.filter(
                (sa) => !(sa.subjectId === subjectId && sa.classId === classId)
              ),
            };
          }
          return assignment;
        })
      );
    } catch (error: any) {
      console.error('Failed to remove assignment:', error);
      showError(error.message || 'Failed to remove assignment. Please try again.');
    }
  };

  const saveAssignments = async () => {
    setSaving(true);
    try {
      // Save class teacher assignments
      const classTeacherUpdates = assignments
        .filter((a) => a.isClassTeacher && a.classId)
        .map((a) => ({
          teacherId: a.teacherId,
          classId: a.classId!,
        }));

      // Update classes with class teachers
      const updatePromises = classTeacherUpdates.map((update) =>
        fetch(`/api/classes/${update.classId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ classTeacherId: update.teacherId }),
        })
      );

      await Promise.all(updatePromises);

      showSuccess('Assignments saved successfully!');
    } catch (error: any) {
      console.error('Failed to save assignments:', error);
      showError(error.message || 'Failed to save assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex-1">
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Teacher Assignments</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage class and subject assignments for teachers
          </p>
        </div>
        <button
          onClick={saveAssignments}
          disabled={saving}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save All
            </>
          )}
        </button>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200">
            <TikTokLoader text="Fetching assignments..." />
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">No teachers found</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.teacherId}
              className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm md:text-base font-medium text-white">
                      {assignment.teacherName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">
                      {assignment.teacherName}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">{assignment.teacherEmail}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {assignment.isClassTeacher && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Class Teacher
                        </span>
                      )}
                      {assignment.isSubjectTeacher && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Subject Teacher
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setEditingTeacher(editingTeacher === assignment.teacherId ? null : assignment.teacherId)
                  }
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Class Assignment */}
                {assignment.isClassTeacher && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-900 uppercase">Class Assignment</span>
                      </div>
                      {editingTeacher === assignment.teacherId && assignment.isClassTeacher && (
                        <select
                          value={assignment.classId || ''}
                          onChange={(e) => {
                            const classId = e.target.value;
                            const classItem = classes.find((c) => c.id === classId);
                            setAssignments((prev) =>
                              prev.map((a) =>
                                a.teacherId === assignment.teacherId
                                  ? { ...a, classId, className: classItem?.name }
                                  : a
                              )
                            );
                          }}
                          className="text-xs px-2 py-1 border border-blue-300 rounded bg-white"
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {assignment.className ? (
                      <p className="text-sm md:text-base font-semibold text-gray-900">
                        {assignment.className}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">No class assigned</p>
                    )}
                  </div>
                )}

                {/* Subject Assignments */}
                {(assignment.isSubjectTeacher || assignment.isClassTeacher) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-900 uppercase">
                          Subject Assignments
                        </span>
                      </div>
                      {editingTeacher === assignment.teacherId && (
                        <button
                          onClick={() => setEditingTeacher(assignment.teacherId)}
                          className="text-xs text-green-700 hover:text-green-900"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Add Subject Assignment Form */}
                    {editingTeacher === assignment.teacherId && (
                      <div className="mb-3 p-2 bg-white rounded border border-green-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                          >
                            <option value="">Select Class</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                          >
                            <option value="">Select Subject</option>
                            {subjects.map((subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => addSubjectAssignment(assignment.teacherId)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subject Assignments List */}
                    {assignment.subjectAssignments.length > 0 ? (
                      <div className="space-y-2">
                        {assignment.subjectAssignments.map((sa, index) => (
                          <div
                            key={`${sa.subjectId}-${sa.classId}-${index}`}
                            className="flex items-center justify-between p-2 bg-white rounded border border-green-300"
                          >
                            <div>
                              <span className="text-sm font-medium text-gray-900">{sa.subjectName}</span>
                              <span className="text-xs text-gray-600 ml-2">({sa.className})</span>
                            </div>
                            {editingTeacher === assignment.teacherId && (
                              <button
                                onClick={() =>
                                  removeSubjectAssignment(assignment.teacherId, sa.subjectId, sa.classId)
                                }
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No subjects assigned</p>
                    )}
                  </div>
                )}

                {/* No assignments message */}
                {!assignment.isClassTeacher && !assignment.isSubjectTeacher && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No roles assigned</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
