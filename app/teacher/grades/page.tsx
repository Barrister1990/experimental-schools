'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { GradeWithDetails } from '@/lib/services/grade-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/utils/academic-years';
import { getLevelCategory, getLevelName } from '@/lib/utils/class-levels';
import { calculateGrade, getGradeColorClass } from '@/lib/utils/grading';
import { Class, Subject } from '@/types';
import { Calendar, ClipboardList, Eye, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Using GradeWithDetails from grade-service
type GradeRecord = GradeWithDetails;

export default function GradesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError } = useAlert();
  const [filteredGrades, setFilteredGrades] = useState<GradeRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Load all classes and subjects for filtering
        const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
          fetch('/api/classes', { credentials: 'include' }),
          fetch('/api/subjects', { credentials: 'include' }),
          fetch('/api/subject-assignments', { credentials: 'include' }),
        ]);

        if (classesRes.ok) {
          const allClasses = await classesRes.json();
          setClasses(Array.isArray(allClasses) ? allClasses : []);
        }

        if (subjectsRes.ok) {
          const allSubjects = await subjectsRes.json();
          setSubjects(Array.isArray(allSubjects) ? allSubjects : []);
        }

        // For filtering dropdowns: only show classes where teacher teaches subjects
        if (assignmentsRes.ok) {
          const assignments = await assignmentsRes.json();
          const gradableClassIds = Array.isArray(assignments) && assignments.length > 0
            ? [...new Set(assignments.map((a: any) => a.classId))]
            : [];
          
          if (gradableClassIds.length > 0) {
            const classesRes2 = await fetch('/api/classes', { credentials: 'include' });
            if (classesRes2.ok) {
              const allClasses = await classesRes2.json();
              const filterableClasses = Array.isArray(allClasses)
                ? allClasses.filter((c: Class) => gradableClassIds.includes(c.id))
                : [];
              setClasses(filterableClasses);
            }
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
  }, [user?.id]);

  // Get subjects for selected class
  // When viewing: show all subjects for that class level
  // When entering: filter by teacher's subject assignments
  const getSubjectsForClass = () => {
    if (!selectedClass) return [];
    const selectedClassData = classes.find((c) => c.id === selectedClass);
    if (!selectedClassData) return [];

    // Get subjects that match the class level category
    const levelCategory = getLevelCategory(selectedClassData.level);
    const levelSubjects = subjects.filter((subject) => subject.levelCategories.includes(levelCategory));
    
    // For viewing: return all subjects for that level
    // Note: When actually entering grades, the "Enter Grades" page will filter by assignments
    return levelSubjects;
  };

  // Load grades when filters are selected
  useEffect(() => {
    const loadGrades = async () => {
      if (!selectedClass || !selectedSubject || !selectedTerm || !selectedAcademicYear) {
        setFilteredGrades([]);
        return;
      }

      try {
        const gradesRes = await fetch(
          `/api/grades?classId=${selectedClass}&subjectId=${selectedSubject}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
          { credentials: 'include' }
        );

        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          const sortedGrades = Array.isArray(gradesData)
            ? gradesData.sort((a: GradeWithDetails, b: GradeWithDetails) =>
                (a.studentName || '').localeCompare(b.studentName || '')
              )
            : [];
          setFilteredGrades(sortedGrades);
        } else {
          setFilteredGrades([]);
        }
      } catch (error: any) {
        console.error('Failed to load grades:', error);
        setFilteredGrades([]);
      }
    };

    loadGrades();
  }, [selectedClass, selectedSubject, selectedTerm, selectedAcademicYear]);

  // Reset subject when class changes
  useEffect(() => {
    setSelectedSubject('');
  }, [selectedClass]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching grades..." />
      </div>
    );
  }

  const availableSubjects = getSubjectsForClass();
  const selectedClassData = classes.find((c) => c.id === selectedClass);

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">All Grades</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            View student grades by class, subject, and term
          </p>
        </div>
        <button
          onClick={() => router.push('/teacher/grades/enter')}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <ClipboardList className="h-4 w-4" />
          Enter Grades
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({getLevelName(cls.level)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="block w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {!selectedClass && (
              <p className="mt-1 text-xs text-gray-500">Please select a class first</p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="block w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      {selectedClass && selectedSubject && selectedTerm ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              {selectedClassData?.name} - {subjects.find((s) => s.id === selectedSubject)?.name} - Term {selectedTerm}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {filteredGrades.length} student{filteredGrades.length !== 1 ? 's' : ''}
            </p>
          </div>

          {filteredGrades.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm md:text-base text-gray-600">No grades found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Project (40)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Test 1 (20)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Test 2 (20)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Group Work (20)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Exam (100)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total (%)
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGrades.map((grade) => {
                    // Recalculate total and grade from current scores to ensure accuracy
                    const classTotal = (grade.project || 0) + (grade.test1 || 0) + (grade.test2 || 0) + (grade.groupWork || 0);
                    const classMax = 40 + 20 + 20 + 20; // 100
                    const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
                    const examScore = ((grade.exam || 0) / 100) * 50;
                    const total = classScore + examScore;
                    const gradeLetter = calculateGrade(total);
                    
                    return (
                    <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {grade.studentName || 'N/A'}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {grade.project}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {grade.test1}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {grade.test2}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {grade.groupWork}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                        {grade.exam}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                        {Math.round(total * 10) / 10}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColorClass(gradeLetter)}`}>
                        {gradeLetter}
                      </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/teacher/students/${grade.studentId}/grades`)}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm md:text-base text-gray-600 mb-2">
            Select a class, subject, and term to view grades
          </p>
          <p className="text-xs text-gray-500">
            {!selectedClass && 'Start by selecting a class'}
            {selectedClass && !selectedSubject && 'Now select a subject'}
            {selectedClass && selectedSubject && !selectedTerm && 'Finally select a term'}
          </p>
        </div>
      )}
    </div>
  );
}
