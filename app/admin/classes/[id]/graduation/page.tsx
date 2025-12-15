'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, GraduationCap, Plus, X, Save, Trash2 } from 'lucide-react';
import { Class, Student } from '@/types';
import { isHighestLevel } from '@/lib/utils/class-levels';
import { useAlert } from '@/components/shared/AlertProvider';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';

interface BECEResult {
  id: string;
  studentId: string;
  subject: string;
  grade: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function GraduationPage() {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useAlert();
  const params = useParams();
  const classId = params.id as string;
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [beceResults, setBeceResults] = useState<Record<string, BECEResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [academicYear, setAcademicYear] = useState<string>(getCurrentAcademicYear());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classRes, studentsRes] = await Promise.all([
          fetch(`/api/classes/${classId}`, { credentials: 'include' }),
          fetch(`/api/students?classId=${classId}`, { credentials: 'include' }),
        ]);

        if (!classRes.ok || !studentsRes.ok) {
          throw new Error('Failed to load class or students');
        }

        const classData = await classRes.json();
        const studentsData = await studentsRes.json();

        setClassInfo(classData);
        const activeStudents = studentsData.filter((s: Student) => s.status === 'active');
        setStudents(activeStudents);

        // Initialize empty BECE results for each student
        const initialResults: Record<string, BECEResult[]> = {};
        activeStudents.forEach((student: Student) => {
          initialResults[student.id] = [];
        });
        setBeceResults(initialResults);
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      loadData();
    }
  }, [classId]);

  const addSubject = (studentId: string) => {
    setBeceResults((prev) => ({
      ...prev,
      [studentId]: [
        ...(prev[studentId] || []),
        {
          id: `temp-${Date.now()}`,
          studentId,
          subject: '',
          grade: '',
          remark: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    }));
  };

  const removeSubject = (studentId: string, resultId: string) => {
    setBeceResults((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).filter((r) => r.id !== resultId),
    }));
  };

  const updateResult = (studentId: string, resultId: string, field: keyof BECEResult, value: string) => {
    setBeceResults((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || []).map((r) =>
        r.id === resultId ? { ...r, [field]: value, updatedAt: new Date() } : r
      ),
    }));
  };

  const handleSave = async () => {
    // Validate all results
    for (const studentId of Object.keys(beceResults)) {
      const results = beceResults[studentId];
      for (const result of results) {
        if (!result.subject || !result.grade) {
          showWarning('Please fill in all subject and grade fields');
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Prepare BECE results for saving
      const resultsToSave: any[] = [];
      Object.keys(beceResults).forEach((studentId) => {
        beceResults[studentId].forEach((result) => {
          if (result.subject && result.grade) {
            resultsToSave.push({
              studentId,
              academicYear,
              subject: result.subject,
              grade: result.grade,
              remark: result.remark || '',
            });
          }
        });
      });

      // Save BECE results
      if (resultsToSave.length > 0) {
        const beceRes = await fetch('/api/bece-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(resultsToSave),
        });

        if (!beceRes.ok) {
          const errorData = await beceRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save BECE results');
        }
      }

      // Update student status to 'graduated'
      const updatePromises = students.map((student) =>
        fetch(`/api/students/${student.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'graduated' }),
        })
      );

      const updateResults = await Promise.all(updatePromises);
      const failedUpdates = updateResults.filter((res) => !res.ok);

      if (failedUpdates.length > 0) {
        throw new Error('Failed to update some student statuses');
      }

      showSuccess('BECE results saved successfully! Students have been graduated.');
      router.push(`/admin/classes/${classId}`);
    } catch (error: any) {
      console.error('Failed to save BECE results:', error);
      showError(error.message || 'Failed to save BECE results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching graduation data..." />
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
            Graduate {classInfo.name}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Enter BECE results for graduating students
          </p>
        </div>
      </div>

      {/* Academic Year */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Academic Year of Graduation
        </label>
        <input
          type="text"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          placeholder="2024/2025"
          className="w-full md:w-1/3 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
        />
      </div>

      {/* Students and BECE Results */}
      <div className="space-y-4 md:space-y-6">
        {students.map((student) => (
          <div key={student.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 mb-4">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm md:text-base font-medium text-blue-600">
                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  {student.firstName} {student.middleName} {student.lastName}
                </h3>
                <p className="text-xs md:text-sm text-gray-600">{student.studentId}</p>
              </div>
            </div>

            {/* BECE Results Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">BECE Results</h4>
                <button
                  onClick={() => addSubject(student.id)}
                  className="px-3 py-1.5 text-xs md:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  Add Subject
                </button>
              </div>

              {beceResults[student.id] && beceResults[student.id].length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Remark
                        </th>
                        <th className="px-3 md:px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {beceResults[student.id].map((result) => (
                        <tr key={result.id}>
                          <td className="px-3 md:px-4 py-2">
                            <input
                              type="text"
                              value={result.subject}
                              onChange={(e) => updateResult(student.id, result.id, 'subject', e.target.value)}
                              placeholder="e.g., Mathematics"
                              className="w-full px-2 md:px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 md:px-4 py-2">
                            <select
                              value={result.grade}
                              onChange={(e) => updateResult(student.id, result.id, 'grade', e.target.value)}
                              className="w-full px-2 md:px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Grade</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="E">E</option>
                              <option value="F">F</option>
                            </select>
                          </td>
                          <td className="px-3 md:px-4 py-2">
                            <input
                              type="text"
                              value={result.remark || ''}
                              onChange={(e) => updateResult(student.id, result.id, 'remark', e.target.value)}
                              placeholder="Optional remark"
                              className="w-full px-2 md:px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 md:px-4 py-2 text-right">
                            <button
                              onClick={() => removeSubject(student.id, result.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500 mb-3">No BECE results added yet</p>
                  <button
                    onClick={() => addSubject(student.id)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Subject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save BECE Results & Graduate Students'}
          </button>
        </div>
      )}
    </div>
  );
}

