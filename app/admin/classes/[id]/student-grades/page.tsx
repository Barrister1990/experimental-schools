'use client';

import ClassReportCard from '@/components/reports/ClassReportCard';
import TikTokLoader from '@/components/TikTokLoader';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/utils/academic-years';
import { getGradeColorClass } from '@/lib/utils/grading';
import { Class, Student, Subject } from '@/types';
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

interface SubjectGrade {
  subjectId: string;
  subjectName: string;
  classScore: number;
  examScore: number;
  total: number;
  grade: string;
  position: number;
}

interface StudentGradeData {
  student: Student;
  subjectGrades: Array<{
    subjectId: string;
    subjectName: string;
    classScore: number;
    examScore: number;
    total: number;
    grade: string;
    position: number;
  }>;
  attendance?: { presentDays: number; totalDays: number };
  evaluation?: { conduct?: string; interest?: string; remarks?: string };
  classPosition?: number; // Overall position in class ranking
  rollNumber?: number; // Position in class enrollment
  overallTotal?: number; // Sum of all subject totals
}

export default function ClassStudentGradesPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentGradesData, setStudentGradesData] = useState<StudentGradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [closingDate, setClosingDate] = useState<string | undefined>(undefined);
  const [reopeningDate, setReopeningDate] = useState<string | undefined>(undefined);

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

        // Load students in the class
        const studentsRes = await fetch(`/api/students?classId=${classId}`, { credentials: 'include' });
        let studentsData: Student[] = [];
        if (studentsRes.ok) {
          studentsData = await studentsRes.json();
          setStudents(Array.isArray(studentsData) ? studentsData : []);
        }

        // Load subjects
        const subjectsRes = await fetch('/api/subjects', { credentials: 'include' });
        let subjectsData: Subject[] = [];
        if (subjectsRes.ok) {
          subjectsData = await subjectsRes.json();
          setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        }

        if (studentsData.length === 0) {
          setLoading(false);
          return;
        }

        // Load grades, attendance, and evaluations for all students
        const allStudentData: StudentGradeData[] = await Promise.all(
          studentsData.map(async (student) => {
            // Load grades
            const gradesRes = await fetch(
              `/api/grades?studentId=${student.id}&term=${selectedTerm}&academicYear=${selectedAcademicYear}&withDetails=true`,
              { credentials: 'include' }
            );

            let gradesArray: any[] = [];
            if (gradesRes.ok) {
              const gradesData = await gradesRes.json();
              gradesArray = Array.isArray(gradesData) ? gradesData : [];
            }

            // Group grades by subject
            const subjectGradeMap = new Map<string, SubjectGrade>();
            gradesArray.forEach((grade: any) => {
              const subjectId = grade.subjectId;
              const subjectName = grade.subjectName || 'Unknown';

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
                  classScore: Math.round(classScore * 10) / 10,
                  examScore: Math.round(examScore * 10) / 10,
                  total: Math.round(total * 10) / 10,
                  grade: gradeLetter,
                  position: 0, // Will be calculated later
                });
              }
            });

            // Calculate positions for each subject
            const subjectGrades = Array.from(subjectGradeMap.values());
            subjectsData.forEach((subject) => {
              const subjectGrade = subjectGrades.find((sg) => sg.subjectId === subject.id);
              if (subjectGrade) {
                // Get all students' scores for this subject to calculate position
                // For now, we'll set position to 0 and calculate it when needed
                // In a real implementation, you'd fetch all students' grades for this subject
              }
            });

            // Load attendance
            let attendanceData: { presentDays: number; totalDays: number } | undefined;
            const attendanceRes = await fetch(
              `/api/attendance?studentId=${student.id}&classId=${classId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}`,
              { credentials: 'include' }
            );
            if (attendanceRes.ok) {
              const attendance = await attendanceRes.json();
              if (attendance && attendance.length > 0) {
                const att = attendance[0];
                attendanceData = {
                  presentDays: att.presentDays || 0,
                  totalDays: att.totalDays || 0,
                };
              }
            }

            // Load evaluation
            let evaluationData: { conduct?: string; interest?: string; remarks?: string } | undefined;
            const evalRes = await fetch(
              `/api/evaluations?studentId=${student.id}&classId=${classId}&term=${selectedTerm}&academicYear=${selectedAcademicYear}`,
              { credentials: 'include' }
            );
            if (evalRes.ok) {
              const evaluations = await evalRes.json();
              console.log(`[StudentGrades] Student ${student.firstName} ${student.lastName} - Evaluations API response:`, evaluations);
              
              // Handle both array and single object responses
              let evaluation = null;
              if (Array.isArray(evaluations)) {
                if (evaluations.length > 0) {
                  evaluation = evaluations[0];
                }
              } else if (evaluations && typeof evaluations === 'object') {
                // Single object response
                evaluation = evaluations;
              }
              
              if (evaluation) {
                console.log(`[StudentGrades] Raw evaluation object:`, evaluation);
                evaluationData = {
                  conduct: evaluation.conductRating,
                  interest: evaluation.interestLevel,
                  remarks: evaluation.classTeacherRemarks,
                };
                console.log(`[StudentGrades] Processed evaluationData:`, evaluationData);
              } else {
                console.log(`[StudentGrades] No evaluations found for student ${student.firstName} ${student.lastName}`);
              }
            } else {
              console.log(`[StudentGrades] Failed to fetch evaluations for student ${student.firstName} ${student.lastName}, status:`, evalRes.status);
            }

            return {
              student,
              subjectGrades,
              attendance: attendanceData,
              evaluation: evaluationData,
            };
          })
        );

        // Calculate positions for each subject across all students
        subjectsData.forEach((subject) => {
          const allScores = allStudentData
            .map((data) => {
              const sg = data.subjectGrades.find((sg) => sg.subjectId === subject.id);
              return { studentId: data.student.id, total: sg?.total || 0 };
            })
            .sort((a, b) => b.total - a.total);

          allStudentData.forEach((data) => {
            const sg = data.subjectGrades.find((sg) => sg.subjectId === subject.id);
            if (sg) {
              const index = allScores.findIndex((s) => s.studentId === data.student.id);
              sg.position = index >= 0 ? index + 1 : 0;
            }
          });
        });

        // Calculate overall class position (based on total of all subjects)
        const studentsWithOverallTotal = allStudentData.map((data) => {
          const overallTotal = data.subjectGrades.reduce((sum, sg) => sum + sg.total, 0);
          return {
            ...data,
            overallTotal,
          };
        });

        // Sort by overall total descending and assign class positions
        studentsWithOverallTotal.sort((a, b) => b.overallTotal - a.overallTotal);
        studentsWithOverallTotal.forEach((data, index) => {
          data.classPosition = index + 1;
        });

        // Sort students by enrollment date or student ID for roll number
        const sortedByEnrollment = [...studentsWithOverallTotal].sort((a, b) => {
          const dateA = a.student.enrollmentDate ? new Date(a.student.enrollmentDate).getTime() : 0;
          const dateB = b.student.enrollmentDate ? new Date(b.student.enrollmentDate).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;
          // If same enrollment date, sort by student ID
          return a.student.studentId.localeCompare(b.student.studentId);
        });

        // Assign roll numbers
        sortedByEnrollment.forEach((data, index) => {
          data.rollNumber = index + 1;
        });

        // Log evaluation data before setting state
        console.log('[StudentGrades] Final studentGradesData with evaluations:');
        studentsWithOverallTotal.forEach((data) => {
          console.log(`  Student: ${data.student.firstName} ${data.student.lastName}`);
          console.log(`    Evaluation:`, data.evaluation);
          console.log(`    Has evaluation:`, !!data.evaluation);
          if (data.evaluation) {
            console.log(`    Conduct: "${data.evaluation.conduct}"`);
            console.log(`    Interest: "${data.evaluation.interest}"`);
            console.log(`    Remarks: "${data.evaluation.remarks}"`);
          }
        });

        setStudentGradesData(studentsWithOverallTotal);

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

    if (classId) {
      loadData();
    }
  }, [classId, selectedTerm, selectedAcademicYear]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching student grades..." />
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
              Student Grades - {classInfo.name}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              View all student grades for this class
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

      {/* Student Grades Sections */}
      <div className="space-y-6">
        {studentGradesData.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>No student grades found for the selected term and academic year.</p>
          </div>
        ) : (
          studentGradesData.map((data) => {
            const studentName = `${data.student.firstName} ${data.student.middleName || ''} ${data.student.lastName}`.trim();
            const filteredGrades = data.subjectGrades.map((sg) => {
              // Always recalculate grade from scores using hardcoded grading system (matching report cards)
              const totalScore = sg.total || 0;
              const gradeLetter = calculateGradeFromPercentage(totalScore);
              return {
                subject: sg.subjectName || 'Unknown',
                classScore: sg.classScore || 0,
                examScore: sg.examScore || 0,
                totalScore,
                grade: gradeLetter,
                position: sg.position || 0,
              };
            });

            return (
              <div key={data.student.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Student Header */}
                <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-gray-900">{studentName}</h2>
                      <p className="text-sm text-gray-600 mt-1">Student ID: {data.student.studentId}</p>
                    </div>
                  </div>
                </div>

                {/* Grades Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-0">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Class Score (50%)
                        </th>
                        <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Exam Score (50%)
                        </th>
                        <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Total
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
                      {filteredGrades.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 md:px-6 py-8 text-center text-gray-500">
                            No grades available for this student
                          </td>
                        </tr>
                      ) : (
                        filteredGrades.map((grade, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm md:text-base font-medium text-gray-900">
                              {grade.subject}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base text-gray-900">
                              {grade.classScore.toFixed(1)}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base text-gray-900">
                              {grade.examScore.toFixed(1)}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base font-semibold text-gray-900">
                              {grade.totalScore.toFixed(1)}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 text-xs md:text-sm font-semibold rounded ${getGradeColorClass(grade.grade)}`}>
                                {grade.grade}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center text-sm md:text-base text-gray-900">
                              {grade.position > 0 ? grade.position : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Print Button */}
      {classInfo && studentGradesData.length > 0 && (
        <div className="fixed bottom-6 right-6 z-20">
          <ClassReportCard
            classInfo={classInfo}
            year={selectedAcademicYear}
            term={selectedTerm}
            studentGradesData={studentGradesData}
            closingDate={closingDate}
            reopeningDate={reopeningDate}
          />
        </div>
      )}
    </div>
  );
}

