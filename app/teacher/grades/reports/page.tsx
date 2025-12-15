'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Filter, Calendar, FileBarChart, Download, TrendingUp, BarChart3 } from 'lucide-react';
import { Student, Subject, Class } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export default function GradeReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError } = useAlert();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [loading, setLoading] = useState(true);

  // Real-time grade statistics
  const [gradeDistribution, setGradeDistribution] = useState<{ grade: string; count: number }[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<{ subject: string; average: number }[]>([]);
  const [classPerformance, setClassPerformance] = useState<{ class: string; average: number }[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    averageScore: 0,
    passRate: 0,
    topGrade: 'N/A',
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Load initial data (students, subjects, classes)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, subjectsRes, classesRes, assignmentsRes] = await Promise.all([
          fetch('/api/students', { credentials: 'include' }),
          fetch('/api/subjects', { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
          fetch('/api/subject-assignments', { credentials: 'include' }),
        ]);

        let relevantStudents: Student[] = [];
        let relevantClasses: Class[] = [];
        let relevantSubjects: Subject[] = [];

        if (studentsRes.ok) {
          const allStudents = await studentsRes.json();
          relevantStudents = Array.isArray(allStudents) ? allStudents : [];
        }

        if (subjectsRes.ok) {
          const allSubjects = await subjectsRes.json();
          relevantSubjects = Array.isArray(allSubjects) ? allSubjects : [];
        }

        if (classesRes.ok) {
          const allClasses = await classesRes.json();
          if (user?.isClassTeacher) {
            // Get teacher's classes
            const teacherClassesRes = await fetch(`/api/classes/teacher/${user.id}`, { credentials: 'include' });
            if (teacherClassesRes.ok) {
              const teacherClasses = await teacherClassesRes.json();
              relevantClasses = Array.isArray(teacherClasses) ? teacherClasses : [];
              const myClassIds = relevantClasses.map((c: Class) => c.id);
              relevantStudents = relevantStudents.filter((s: Student) => myClassIds.includes(s.classId));
            }
          } else {
            relevantClasses = Array.isArray(allClasses) ? allClasses : [];
          }
        }

        // Filter subjects based on teacher's assignments
        if (assignmentsRes.ok && user?.id) {
          const assignments = await assignmentsRes.json();
          const teacherAssignments = Array.isArray(assignments)
            ? assignments.filter((a: any) => a.teacherId === user.id)
            : [];
          
          const assignedSubjectIds = [...new Set(teacherAssignments.map((a: any) => a.subjectId))];
          if (assignedSubjectIds.length > 0) {
            relevantSubjects = relevantSubjects.filter((s: Subject) => assignedSubjectIds.includes(s.id));
          }
        }

        setStudents(relevantStudents);
        setClasses(relevantClasses);
        setSubjects(relevantSubjects);
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, user?.isClassTeacher]);

  // Load statistics and charts when filters change
  useEffect(() => {
    const loadStatistics = async () => {
      if (!user?.id) return;

      setLoadingStats(true);
      try {
        // Build filters for grades API
        const gradeFilters: string[] = [];
        gradeFilters.push(`teacherId=${user.id}`);
        if (selectedAcademicYear !== 'all') {
          gradeFilters.push(`academicYear=${selectedAcademicYear}`);
        }
        if (selectedTerm !== 'all') {
          gradeFilters.push(`term=${selectedTerm}`);
        }
        if (selectedClass !== 'all') {
          gradeFilters.push(`classId=${selectedClass}`);
        }
        if (selectedSubject !== 'all') {
          gradeFilters.push(`subjectId=${selectedSubject}`);
        }

        // Fetch grades with details
        const gradesRes = await fetch(
          `/api/grades?${gradeFilters.join('&')}&withDetails=true`,
          { credentials: 'include' }
        );

        if (!gradesRes.ok) {
          throw new Error('Failed to fetch grades');
        }

        const grades = await gradesRes.json();
        const gradesArray = Array.isArray(grades) ? grades : [];

        // Calculate summary statistics
        if (gradesArray.length > 0) {
          const totals = gradesArray.map((g: any) => g.total || 0).filter((t: number) => t > 0);
          const averageScore = totals.length > 0
            ? totals.reduce((sum: number, t: number) => sum + t, 0) / totals.length
            : 0;

          // Calculate pass rate (HP, P, AP are passing grades)
          const passingGrades = ['HP', 'P', 'AP'];
          const passingCount = gradesArray.filter((g: any) => 
            g.grade && passingGrades.includes(g.grade)
          ).length;
          const passRate = gradesArray.length > 0
            ? (passingCount / gradesArray.length) * 100
            : 0;

          // Find top grade (most common)
          const gradeCounts: Record<string, number> = {};
          gradesArray.forEach((g: any) => {
            if (g.grade) {
              gradeCounts[g.grade] = (gradeCounts[g.grade] || 0) + 1;
            }
          });
          const topGrade = Object.keys(gradeCounts).length > 0
            ? Object.keys(gradeCounts).reduce((a, b) => gradeCounts[a] > gradeCounts[b] ? a : b)
            : 'N/A';

          // Get unique students count
          const uniqueStudents = new Set(gradesArray.map((g: any) => g.studentId));

          setSummaryStats({
            totalStudents: uniqueStudents.size,
            averageScore: Math.round(averageScore * 10) / 10,
            passRate: Math.round(passRate * 10) / 10,
            topGrade,
          });

          // Calculate grade distribution
          const distribution = [
            { grade: 'HP', count: gradeCounts['HP'] || 0 },
            { grade: 'P', count: gradeCounts['P'] || 0 },
            { grade: 'AP', count: gradeCounts['AP'] || 0 },
            { grade: 'D', count: gradeCounts['D'] || 0 },
            { grade: 'E', count: gradeCounts['E'] || 0 },
          ];
          setGradeDistribution(distribution);
        } else {
          setSummaryStats({
            totalStudents: 0,
            averageScore: 0,
            passRate: 0,
            topGrade: 'N/A',
          });
          setGradeDistribution([
            { grade: 'HP', count: 0 },
            { grade: 'P', count: 0 },
            { grade: 'AP', count: 0 },
            { grade: 'D', count: 0 },
            { grade: 'E', count: 0 },
          ]);
        }

        // Fetch subject performance from analytics API
        const subjectAnalyticsParams = new URLSearchParams();
        if (selectedAcademicYear !== 'all') {
          subjectAnalyticsParams.append('academicYear', selectedAcademicYear);
        }
        if (selectedTerm !== 'all') {
          subjectAnalyticsParams.append('term', selectedTerm);
        }
        if (selectedClass !== 'all') {
          subjectAnalyticsParams.append('classId', selectedClass);
        }
        if (selectedSubject !== 'all') {
          subjectAnalyticsParams.append('subjectId', selectedSubject);
        }

        const subjectAnalyticsRes = await fetch(
          `/api/analytics/subjects?${subjectAnalyticsParams.toString()}`,
          { credentials: 'include' }
        );

        if (subjectAnalyticsRes.ok) {
          const subjectPerf = await subjectAnalyticsRes.json();
          const subjectPerfArray = Array.isArray(subjectPerf) ? subjectPerf : [];
          setSubjectPerformance(
            subjectPerfArray.map((sp: any) => ({
              subject: sp.subjectName || 'Unknown',
              average: Math.round(sp.averageScore * 10) / 10,
            }))
          );
        } else {
          setSubjectPerformance([]);
        }

        // Fetch class performance if class teacher
        if (user?.isClassTeacher && selectedClass !== 'all') {
          const classAnalyticsParams = new URLSearchParams();
          if (selectedAcademicYear !== 'all') {
            classAnalyticsParams.append('academicYear', selectedAcademicYear);
          }
          if (selectedTerm !== 'all') {
            classAnalyticsParams.append('term', selectedTerm);
          }

          const classAnalyticsRes = await fetch(
            `/api/analytics/classes/${selectedClass}?${classAnalyticsParams.toString()}`,
            { credentials: 'include' }
          );

          if (classAnalyticsRes.ok) {
            const classPerf = await classAnalyticsRes.json();
            if (classPerf) {
              setClassPerformance([
                {
                  class: classPerf.className || 'Unknown',
                  average: Math.round(classPerf.averageScore * 10) / 10,
                },
              ]);
            } else {
              setClassPerformance([]);
            }
          } else {
            setClassPerformance([]);
          }
        } else {
          setClassPerformance([]);
        }
      } catch (error: any) {
        console.error('Failed to load statistics:', error);
        // Don't show alert for stats loading errors, just log
      } finally {
        setLoadingStats(false);
      }
    };

    if (user?.id && !loading) {
      loadStatistics();
    }
  }, [user?.id, selectedAcademicYear, selectedTerm, selectedClass, selectedSubject, loading]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching grade reports..." />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Grade Reports</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          View grade analytics and performance reports
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="block w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Students</p>
          {loadingStats ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-xl md:text-2xl font-semibold text-gray-900">{summaryStats.totalStudents}</p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Average Score</p>
          {loadingStats ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-xl md:text-2xl font-semibold text-blue-600">
              {summaryStats.averageScore > 0 ? `${summaryStats.averageScore}%` : 'N/A'}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Pass Rate</p>
          {loadingStats ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-xl md:text-2xl font-semibold text-green-600">
              {summaryStats.passRate > 0 ? `${summaryStats.passRate}%` : 'N/A'}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Top Grade</p>
          {loadingStats ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-xl md:text-2xl font-semibold text-purple-600">{summaryStats.topGrade}</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grade" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Subject Performance</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Performance */}
        {user?.isClassTeacher && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 lg:col-span-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Class Performance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Export Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Download className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Export Grade Sheet</h3>
            <p className="text-xs text-gray-600">Download grade data as Excel</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <FileBarChart className="h-5 w-5 text-green-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Generate PDF Report</h3>
            <p className="text-xs text-gray-600">Create comprehensive PDF report</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <TrendingUp className="h-5 w-5 text-purple-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Performance Analysis</h3>
            <p className="text-xs text-gray-600">Detailed performance breakdown</p>
          </button>
        </div>
      </div>
    </div>
  );
}

