'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, GraduationCap, Check, X } from 'lucide-react';
import { Class, Student } from '@/types';
import { getLevelName, getNextLevel, isHighestLevel } from '@/lib/utils/class-levels';
import { useAlert } from '@/components/shared/AlertProvider';

export default function PromoteClassPage() {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useAlert();
  const params = useParams();
  const classId = params.id as string;
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [nextLevelClasses, setNextLevelClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classRes, studentsRes, allClassesRes] = await Promise.all([
          fetch(`/api/classes/${classId}`, { credentials: 'include' }),
          fetch(`/api/students?classId=${classId}`, { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
        ]);

        if (classRes.ok) {
          const classData = await classRes.json();
          setClassInfo(classData);
          
          // Get next level classes
          // Multiple classes at the same level can promote to fewer classes at the next level
          if (classData && !isHighestLevel(classData.level)) {
            const nextLevel = getNextLevel(classData.level);
            if (nextLevel !== null && allClassesRes.ok) {
              const allClasses = await allClassesRes.json();
              const allClassesArray = Array.isArray(allClasses) ? allClasses : [];
              const nextClasses = allClassesArray.filter((c: any) => c.level === nextLevel);
              setNextLevelClasses(nextClasses);
              if (nextClasses.length > 0) {
                setTargetClassId(nextClasses[0].id);
              }
            }
          }
        }

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          const studentsArray = Array.isArray(studentsData) ? studentsData : [];
          const activeStudents = studentsArray.filter((s: any) => s.status === 'active');
          setStudents(activeStudents);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      loadData();
    }
  }, [classId]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedStudents(new Set(students.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const handlePromote = async () => {
    if (selectedStudents.size === 0 || !targetClassId) {
      showWarning('Please select students and target class');
      return;
    }

    setPromoting(true);
    try {
      // Update each student's classId via API
      const studentIds = Array.from(selectedStudents);
      const updatePromises = studentIds.map((studentId) =>
        fetch(`/api/students/${studentId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classId: targetClassId,
          }),
        })
      );

      const results = await Promise.all(updatePromises);
      const failed = results.filter((res) => !res.ok);

      if (failed.length > 0) {
        throw new Error(`Failed to promote ${failed.length} student(s)`);
      }

      showSuccess(`Successfully promoted ${selectedStudents.size} student(s)`);
      router.push(`/admin/classes/${classId}`);
    } catch (error) {
      console.error('Failed to promote students:', error);
      showError('Failed to promote students. Please try again.');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching promotion data..." />
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
            Promote {classInfo.name}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Select students to promote to {getNextLevel(classInfo.level) !== null ? getLevelName(getNextLevel(classInfo.level)!) : 'Next Level'}
          </p>
        </div>
      </div>

      {/* Target Class Selection */}
      {!isHighestLevel(classInfo.level) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Promote to Class
          </label>
          {nextLevelClasses.length > 0 ? (
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full md:w-1/2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              {nextLevelClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                No classes found at {getNextLevel(classInfo.level) !== null ? getLevelName(getNextLevel(classInfo.level)!) : 'next level'}. 
                You can still promote students, but you'll need to create the target class first.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Note: Multiple classes at the same level (e.g., Basic 1A and Basic 1B) can promote to the same next level class.
          </p>
        </div>
      )}

      {/* Students Selection */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              Select Students ({selectedStudents.size} selected)
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {students.length} active students available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No active students in this class</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {students.map((student) => {
              const isSelected = selectedStudents.has(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-4 md:p-6 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-blue-600">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm md:text-base font-medium text-gray-900">
                        {student.firstName} {student.middleName} {student.lastName}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        {student.studentId}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={() => router.back()}
          className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePromote}
          disabled={selectedStudents.size === 0 || (nextLevelClasses.length > 0 && !targetClassId) || promoting}
          className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          {promoting ? 'Promoting...' : `Promote ${selectedStudents.size} Student(s)`}
        </button>
      </div>
    </div>
  );
}

