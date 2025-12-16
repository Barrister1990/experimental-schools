'use client';

import PrintReportCard from '@/components/reports/PrintReportCard';
import TikTokLoader from '@/components/TikTokLoader';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/utils/academic-years';
import { getGradeColorClass } from '@/lib/utils/grading';
import { AssessmentType, Class, Student, Subject } from '@/types';
import { ArrowLeft, Calendar, Filter } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Hardcoded grading system matching report cards (HP, P, AP, D, E)
// This matches the grading system used in PrintReportCard and ClassReportCard
const calculateGradeFromPercentage = (percentage: number): string => {
  if (percentage >= 80) return 'HP';
  if (percentage >= 68) return 'P';
  if (percentage >= 54) return 'AP';
  if (percentage >= 40) return 'D';
  return 'E';
};

interface AssessmentScore {
  type: AssessmentType;
  score: number;
  maxScore: number;
}

interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  assessments: AssessmentScore[];
  classScore: number; // 50% of (Project + Test1 + Test2 + Group Work)
  examScore: number; // 50% of Exam
  total: number; // Class Score + Exam Score
  grade: string; // Letter grade
  position: number; // Position in class
}

export default function StudentGradesPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [attendance, setAttendance] = useState<{ presentDays: number; totalDays: number } | null>(null);
  const [evaluation, setEvaluation] = useState<{ conduct?: string; interest?: string; remarks?: string } | null>(null);
  const [classPosition, setClassPosition] = useState<number | undefined>(undefined);
  const [rollNumber, setRollNumber] = useState<number | undefined>(undefined);
  const [totalStudents, setTotalStudents] = useState<number | undefined>(undefined);
  const [closingDate, setClosingDate] = useState<string | undefined>(undefined);
  const [reopeningDate, setReopeningDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student data
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        let studentData: Student | null = null;
        if (studentRes.ok) {
          studentData = await studentRes.json();
          setStudent(studentData);
        }

        if (!studentData || !studentData.classId) {
          setLoading(false);
          return;
        }

        // Load class info
        const classRes = await fetch(`/api/classes/${studentData.classId}`, { credentials: 'include' });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClassInfo(classData);
        }

        // Load subjects
        const subjectsRes = await fetch('/api/subjects', { credentials: 'include' });
        let subjectsData: Subject[] = [];
        if (subjectsRes.ok) {
          subjectsData = await subjectsRes.json();
          setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        }

        // Load grades with details
        const gradesRes = await fetch(
          `/api/grades?studentId=${studentId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
          { credentials: 'include' }
        );

        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          const gradesArray = Array.isArray(gradesData) ? gradesData : [];

          // Group grades by subject and calculate totals
          const subjectGradeMap = new Map<string, SubjectGrade>();

          gradesArray.forEach((grade: any) => {
            const subjectId = grade.subjectId;
            const subjectName = grade.subjectName || 'Unknown';

            // Calculate scores
            const classTotal = (grade.project || 0) + (grade.test1 || 0) + (grade.test2 || 0) + (grade.groupWork || 0);
            const classMax = 40 + 20 + 20 + 20; // 100
            const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
            const examScore = ((grade.exam || 0) / 100) * 50;
            const total = classScore + examScore;
            // Always recalculate grade from scores using hardcoded grading system (matching report cards)
            const gradeLetter = calculateGradeFromPercentage(total);

            if (!subjectGradeMap.has(subjectId)) {
              subjectGradeMap.set(subjectId, {
                subjectId,
                subjectName,
                assessments: [],
                classScore: 0,
                examScore: 0,
                total: 0,
                grade: gradeLetter,
                position: 0,
              });
            }

            const subjectGrade = subjectGradeMap.get(subjectId)!;
            subjectGrade.classScore = Math.round(classScore * 10) / 10;
            subjectGrade.examScore = Math.round(examScore * 10) / 10;
            subjectGrade.total = Math.round(total * 10) / 10;
            subjectGrade.grade = gradeLetter;
            subjectGrade.assessments = [
              { type: 'project', score: grade.project || 0, maxScore: 40 },
              { type: 'test1', score: grade.test1 || 0, maxScore: 20 },
              { type: 'test2', score: grade.test2 || 0, maxScore: 20 },
              { type: 'group_work', score: grade.groupWork || 0, maxScore: 20 },
              { type: 'exam', score: grade.exam || 0, maxScore: 100 },
            ];
          });

          // Calculate positions for each subject
          // Get all students in the same class for position calculation
          if (studentData.classId) {
            const classStudentsRes = await fetch(`/api/students?classId=${studentData.classId}`, { credentials: 'include' });
            if (classStudentsRes.ok) {
              const classStudents = await classStudentsRes.json();
              const studentsArray = Array.isArray(classStudents) ? classStudents : [];
              setTotalStudents(studentsArray.length);

              // Calculate roll number (position in enrollment order)
              const sortedByEnrollment = [...studentsArray].sort((a, b) => {
                const dateA = a.enrollmentDate ? new Date(a.enrollmentDate).getTime() : 0;
                const dateB = b.enrollmentDate ? new Date(b.enrollmentDate).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB;
                return a.studentId.localeCompare(b.studentId);
              });
              const rollIndex = sortedByEnrollment.findIndex((s) => s.id === studentId);
              setRollNumber(rollIndex >= 0 ? rollIndex + 1 : undefined);

              // For each subject, get all grades and calculate positions
              for (const [subjectId, subjectGrade] of subjectGradeMap.entries()) {
                const subjectGradesRes = await fetch(
                  `/api/grades?classId=${studentData.classId}&subjectId=${subjectId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
                  { credentials: 'include' }
                );

                if (subjectGradesRes.ok) {
                  const allSubjectGrades = await subjectGradesRes.json();
                  const allGradesArray = Array.isArray(allSubjectGrades) ? allSubjectGrades : [];

                  // Calculate totals for all students in this subject
                  const studentTotals = allGradesArray.map((g: any) => {
                    const classTotal = (g.project || 0) + (g.test1 || 0) + (g.test2 || 0) + (g.groupWork || 0);
                    const classMax = 40 + 20 + 20 + 20;
                    const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
                    const examScore = ((g.exam || 0) / 100) * 50;
                    return {
                      studentId: g.studentId,
                      total: classScore + examScore,
                    };
                  });

                  // Sort by total descending
                  studentTotals.sort((a, b) => b.total - a.total);

                  // Find position
                  const studentPosition = studentTotals.findIndex((s) => s.studentId === studentId) + 1;
                  subjectGrade.position = studentPosition > 0 ? studentPosition : 0;
                }
              }

              // Calculate overall class position (sum of all subject totals)
              const allClassGradesRes = await fetch(
                `/api/grades?classId=${studentData.classId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
                { credentials: 'include' }
              );

              if (allClassGradesRes.ok) {
                const allClassGrades = await allClassGradesRes.json();
                const allGradesArray = Array.isArray(allClassGrades) ? allClassGrades : [];

                // Group by student and calculate overall total
                const studentOverallTotals = new Map<string, number>();
                allGradesArray.forEach((g: any) => {
                  const classTotal = (g.project || 0) + (g.test1 || 0) + (g.test2 || 0) + (g.groupWork || 0);
                  const classMax = 40 + 20 + 20 + 20;
                  const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
                  const examScore = ((g.exam || 0) / 100) * 50;
                  const total = classScore + examScore;

                  const current = studentOverallTotals.get(g.studentId) || 0;
                  studentOverallTotals.set(g.studentId, current + total);
                });

                // Convert to array and sort
                const sortedOverall = Array.from(studentOverallTotals.entries())
                  .map(([studentId, total]) => ({ studentId, total }))
                  .sort((a, b) => b.total - a.total);

                // Find position
                const overallPosition = sortedOverall.findIndex((s) => s.studentId === studentId) + 1;
                setClassPosition(overallPosition > 0 ? overallPosition : undefined);
              }
            }
          }

          setSubjectGrades(Array.from(subjectGradeMap.values()));
        }

        // Load attendance
        const attendanceRes = await fetch(
          `/api/attendance?studentId=${studentId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}`,
          { credentials: 'include' }
        );

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (Array.isArray(attendanceData) && attendanceData.length > 0) {
            const att = attendanceData[0];
            setAttendance({
              presentDays: att.presentDays || 0,
              totalDays: att.totalDays || 0,
            });
          }
        }

        // Load evaluation (conduct, interest, remarks)
        const evaluationRes = await fetch(
          `/api/evaluations?studentId=${studentId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}`,
          { credentials: 'include' }
        );

        if (evaluationRes.ok) {
          const evaluationData = await evaluationRes.json();
          if (evaluationData) {
            setEvaluation({
              conduct: evaluationData.conductRating || undefined,
              interest: evaluationData.interestLevel || undefined,
              remarks: evaluationData.classTeacherRemarks || undefined,
            });
          }
        }

        // Load term settings for closing and reopening dates
        const termSettingsRes = await fetch(
          `/api/settings/term?academicYear=${encodeURIComponent(selectedAcademicYear)}`,
          { credentials: 'include' }
        );

        if (termSettingsRes.ok) {
          const termSettings = await termSettingsRes.json();
          if (Array.isArray(termSettings)) {
            const currentTermSettings = termSettings.find((ts: any) => ts.term === parseInt(selectedTerm));
            if (currentTermSettings) {
              setClosingDate(currentTermSettings.closingDate);
              // Get next term's reopening date (or current term's reopening date if next term not available)
              const nextTerm = parseInt(selectedTerm) === 3 ? 1 : parseInt(selectedTerm) + 1;
              const nextTermSettings = termSettings.find((ts: any) => ts.term === nextTerm);
              setReopeningDate(nextTermSettings?.reopeningDate || currentTermSettings.reopeningDate);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadData();
    }
  }, [studentId, selectedTerm, selectedAcademicYear]);


  // Prepare grade data for report card
  // Recalculate grade from total score using hardcoded grading system (matching report cards)
  const filteredGradesForReport = subjectGrades.map((sg) => {
    // Always recalculate grade from total score using hardcoded grading system
    const gradeLetter = calculateGradeFromPercentage(sg.total);
    return {
      subject: sg.subjectName,
      classScore: sg.classScore,
      examScore: sg.examScore,
      totalScore: sg.total,
      grade: gradeLetter, // Use recalculated grade
      position: sg.position,
      remark: '', // Can be added later if needed
    };
  });

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching grades..." />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-sm md:text-base text-gray-600">The student you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push(`/admin/students/${studentId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Student Grades</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {student.firstName} {student.middleName || ''} {student.lastName} - {student.studentId}
          </p>
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

      {/* Grades Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-0">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Class Score (%)
                </th>
                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Exam Score (%)
                </th>
                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total (%)
                </th>
                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Position
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectGrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 md:px-6 py-8 text-center text-sm text-gray-500">
                    No grades found for the selected term and academic year
                  </td>
                </tr>
              ) : (
                subjectGrades.map((subjectGrade) => (
                  <tr key={subjectGrade.subjectId} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subjectGrade.subjectName}
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      {subjectGrade.classScore.toFixed(1)}
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      {subjectGrade.examScore.toFixed(1)}
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {subjectGrade.total.toFixed(1)}
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColorClass(subjectGrade.grade)}`}>
                        {subjectGrade.grade}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      {subjectGrade.position}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Floating Download Button */}
      {student && classInfo && (
        <div className="fixed bottom-6 right-6 z-20">
          <PrintReportCard
            student={student}
            classInfo={classInfo}
            year={selectedAcademicYear}
            term={selectedTerm}
            filteredGrades={filteredGradesForReport}
            attendance={attendance || undefined}
            conduct={evaluation?.conduct}
            interest={evaluation?.interest}
            classTeacherRemarks={evaluation?.remarks}
            classPosition={classPosition}
            rollNumber={rollNumber}
            totalStudents={totalStudents}
            closingDate={closingDate}
            reopeningDate={reopeningDate}
          />
        </div>
      )}
    </div>
  );
}
