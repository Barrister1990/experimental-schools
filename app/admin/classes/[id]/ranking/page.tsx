'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Filter, Calendar, Trophy } from 'lucide-react';
import { Class, Student, Subject, User } from '@/types';
import { getLevelCategory } from '@/lib/utils/class-levels';
import PrintClassRanking from '@/components/reports/PrintClassRanking';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';

interface StudentSubjectScore {
  subjectId: string;
  subjectName: string;
  total: number; // Class Score + Exam Score (out of 100)
}

interface StudentRanking {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  subjectScores: StudentSubjectScore[];
  overallTotal: number;
  average: number;
  position: number;
}

export default function ClassRankingPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [classTeacher, setClassTeacher] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load class data
        const classRes = await fetch(`/api/classes/${classId}`, { credentials: 'include' });
        if (!classRes.ok) {
          throw new Error('Failed to load class');
        }
        const classData = await classRes.json();
        setClassInfo(classData);

        if (!classData) {
          setLoading(false);
          return;
        }

        // Load class teacher if assigned
        if (classData.classTeacherId) {
          const teacherRes = await fetch(`/api/teachers/${classData.classTeacherId}`, { credentials: 'include' });
          if (teacherRes.ok) {
            const teacherData = await teacherRes.json();
            setClassTeacher(teacherData);
          }
        }

        // Load students in the class
        const studentsRes = await fetch(`/api/students?classId=${classId}`, { credentials: 'include' });
        let studentsData: Student[] = [];
        if (studentsRes.ok) {
          studentsData = await studentsRes.json();
          setStudents(Array.isArray(studentsData) ? studentsData : []);
        }

        // Load all subjects
        const subjectsRes = await fetch('/api/subjects', { credentials: 'include' });
        let subjectsData: Subject[] = [];
        if (subjectsRes.ok) {
          subjectsData = await subjectsRes.json();
        }

        // Filter subjects by class level category
        const levelCategory = getLevelCategory(classData.level);
        const filteredSubjects = Array.isArray(subjectsData)
          ? subjectsData.filter((subject) =>
              subject.levelCategories && subject.levelCategories.includes(levelCategory)
            )
          : [];
        // Sort subjects alphabetically
        filteredSubjects.sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(filteredSubjects);

        // Calculate rankings
        if (studentsData.length > 0 && filteredSubjects.length > 0) {
          // Fetch grades for all students in this class for the selected term and academic year
          const gradesRes = await fetch(
            `/api/grades?classId=${classId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
            { credentials: 'include' }
          );

          let gradesData: any[] = [];
          if (gradesRes.ok) {
            const grades = await gradesRes.json();
            gradesData = Array.isArray(grades) ? grades : [];
          }

          // Group grades by student and subject
          const studentRankings: StudentRanking[] = studentsData.map((student) => {
            const subjectScores: StudentSubjectScore[] = filteredSubjects.map((subject) => {
              // Find grades for this student and subject
              const studentGrades = gradesData.filter(
                (g: any) => g.studentId === student.id && g.subjectId === subject.id
              );

              if (studentGrades.length === 0) {
                return {
                  subjectId: subject.id,
                  subjectName: subject.name,
                  total: 0,
                };
              }

              // Use the first grade entry (should only be one per student/subject/term/year)
              const grade = studentGrades[0];

              // Calculate scores from assessment fields
              const classTotal = (grade.project || 0) + (grade.test1 || 0) + (grade.test2 || 0) + (grade.groupWork || 0);
              const classMax = 40 + 20 + 20 + 20; // 100
              const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
              const examScore = ((grade.exam || 0) / 100) * 50;
              const total = classScore + examScore;

              return {
                subjectId: subject.id,
                subjectName: subject.name,
                total: Math.round(total * 10) / 10,
              };
            });

            // Calculate overall total and average
            const overallTotal = subjectScores.reduce((sum, s) => sum + s.total, 0);
            const average = subjectScores.length > 0 ? overallTotal / subjectScores.length : 0;

            return {
              studentId: student.id,
              studentName: `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim(),
              studentIdNumber: student.studentId,
              subjectScores,
              overallTotal: Math.round(overallTotal * 10) / 10,
              average: Math.round(average * 10) / 10,
              position: 0, // Will be calculated after sorting
            };
          });

          // Sort by overall total (descending) and assign positions
          studentRankings.sort((a, b) => b.overallTotal - a.overallTotal);
          studentRankings.forEach((ranking, index) => {
            ranking.position = index + 1;
          });

          setRankings(studentRankings);
        } else {
          setRankings([]);
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
  }, [classId, selectedTerm, selectedAcademicYear]);


  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Calculating rankings..." />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Class Not Found</h2>
          <p className="text-sm md:text-base text-gray-600">The class you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push(`/admin/classes/${classId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
          <div>
            <h1 className="text-xl md:text-3xl font-semibold text-gray-900">
              Class Ranking - {classInfo.name}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Student performance ranking by subject
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            Student Rankings
          </h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Academic Year: {selectedAcademicYear} | Term: {selectedTerm}
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No subjects found for this class level.</p>
            <p className="text-xs text-gray-400">
              Please add subjects with the appropriate level category for {classInfo.name}
            </p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students found in this class
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                    Position
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-12 md:left-16 bg-gray-50 z-10 min-w-[150px] border-r border-gray-200">
                    Student Name
                  </th>
                  {subjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[100px]"
                    >
                      {subject.name}
                    </th>
                  ))}
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rankings.map((ranking) => (
                  <tr
                    key={ranking.studentId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className={`px-3 md:px-6 py-4 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200 ${
                      ranking.position === 1 ? 'bg-yellow-50' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        {ranking.position === 1 && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm md:text-base font-semibold text-gray-900">
                          {ranking.position}
                        </span>
                      </div>
                    </td>
                    <td className={`px-3 md:px-6 py-4 whitespace-nowrap sticky left-12 md:left-16 z-10 min-w-[150px] border-r border-gray-200 ${
                      ranking.position === 1 ? 'bg-yellow-50' : 'bg-white'
                    }`}>
                      <div className="text-sm md:text-base font-medium text-gray-900">
                        {ranking.studentName}
                      </div>
                      <div className="text-xs text-gray-500">{ranking.studentIdNumber}</div>
                    </td>
                    {ranking.subjectScores.map((score) => (
                      <td
                        key={score.subjectId}
                        className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base text-gray-900 font-medium"
                      >
                        {score.total.toFixed(1)}
                      </td>
                    ))}
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base font-semibold text-blue-600 bg-blue-50">
                      {ranking.overallTotal.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating PDF Button */}
      {classInfo && (
        <div className="fixed bottom-6 right-6 z-20">
          <PrintClassRanking
            classInfo={classInfo}
            classTeacher={classTeacher}
            year={selectedAcademicYear}
            term={selectedTerm}
            rankings={rankings}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      )}
    </div>
  );
}

