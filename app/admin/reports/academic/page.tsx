'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import { getAcademicYearOptions, getCurrentAcademicYear } from '@/lib/utils/academic-years';
import { calculateGrade } from '@/lib/utils/grading';
import { Class, Subject } from '@/types';
import { ArrowLeft, BarChart3, BookOpen, Calendar, Download, Filter, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AcademicReportsPage() {
  const router = useRouter();
  const { showInfo } = useAlert();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<Record<string, number>>({});
  const [subjectAverages, setSubjectAverages] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('performance');
  const [academicYear, setAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [term, setTerm] = useState<string>('1');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, classesRes] = await Promise.all([
          fetch('/api/subjects', { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
        ]);

        let subjectsData: Subject[] = [];
        let classesData: Class[] = [];

        if (subjectsRes.ok) {
          const data = await subjectsRes.json();
          subjectsData = Array.isArray(data) ? data : [];
        }

        if (classesRes.ok) {
          const data = await classesRes.json();
          classesData = Array.isArray(data) ? data : [];
        }

        setSubjects(subjectsData);
        setClasses(classesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredSubjects = selectedSubject === 'all' 
    ? subjects 
    : subjects.filter((s) => s.id === selectedSubject);

  const handleExport = (format: 'pdf' | 'excel') => {
    showInfo(`${format.toUpperCase()} export functionality will be implemented`);
  };

  const reportTypes = [
    { value: 'performance', label: 'Subject Performance', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'grades', label: 'Grade Distribution', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'term', label: 'Term-wise Analysis', icon: <Calendar className="h-4 w-4" /> },
    { value: 'summary', label: 'Academic Summary', icon: <BookOpen className="h-4 w-4" /> }
  ];

  // Load grade distribution and subject averages
  useEffect(() => {
    const loadGradeData = async () => {
      if (subjects.length === 0) return;

      try {
        // Fetch all grades
        const gradesRes = await fetch('/api/grades?withDetails=true', { credentials: 'include' });
        if (!gradesRes.ok) return;

        const grades = await gradesRes.json();
        const gradesArray = Array.isArray(grades) ? grades : [];

        // Filter by selected filters
        let filteredGrades = gradesArray;
        if (selectedSubject !== 'all') {
          filteredGrades = filteredGrades.filter((g: any) => g.subjectId === selectedSubject);
        }
        if (selectedClass !== 'all') {
          filteredGrades = filteredGrades.filter((g: any) => g.classId === selectedClass);
        }
        if (academicYear) {
          filteredGrades = filteredGrades.filter((g: any) => g.academicYear === academicYear);
        }
        if (term) {
          filteredGrades = filteredGrades.filter((g: any) => g.term.toString() === term);
        }

        // Calculate grade distribution using our grading system (HP, P, AP, D, E)
        const distribution: Record<string, number> = {
          'HP': 0,
          'P': 0,
          'AP': 0,
          'D': 0,
          'E': 0,
        };

        filteredGrades.forEach((grade: any) => {
          // Recalculate grade from current scores to ensure accuracy
          const classTotal = (grade.project || 0) + (grade.test1 || 0) + (grade.test2 || 0) + (grade.groupWork || 0);
          const classMax = 40 + 20 + 20 + 20; // 100
          const classScore = classMax > 0 ? (classTotal / classMax) * 50 : 0;
          const examScore = ((grade.exam || 0) / 100) * 50;
          const total = classScore + examScore;
          const gradeLetter = calculateGrade(total);
          
          const gradeCode = gradeLetter.toUpperCase();
          if (distribution.hasOwnProperty(gradeCode)) {
            distribution[gradeCode]++;
          }
        });

        // Calculate percentages
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        if (total > 0) {
          Object.keys(distribution).forEach((key) => {
            distribution[key] = Math.round((distribution[key] / total) * 100);
          });
        }

        setGradeDistribution(distribution);

        // Calculate subject averages
        const subjectAvgMap = new Map<string, { total: number; count: number }>();
        filteredGrades.forEach((grade: any) => {
          if (grade.subjectId && grade.total !== undefined) {
            const existing = subjectAvgMap.get(grade.subjectId) || { total: 0, count: 0 };
            subjectAvgMap.set(grade.subjectId, {
              total: existing.total + (grade.total || 0),
              count: existing.count + 1,
            });
          }
        });

        const avgMap = new Map<string, number>();
        subjectAvgMap.forEach((value, key) => {
          avgMap.set(key, value.count > 0 ? Math.round(value.total / value.count) : 0);
        });
        setSubjectAverages(avgMap);
      } catch (error) {
        console.error('Failed to load grade data:', error);
      }
    };

    loadGradeData();
  }, [subjects, selectedSubject, selectedClass, academicYear, term]);

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Academic Reports</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Generate comprehensive academic performance reports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-2" />
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="h-4 w-4 inline mr-2" />
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Total Subjects</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">
            {filteredSubjects.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Core Subjects</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">
            {filteredSubjects.filter((s) => s.category === 'core').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Elective Subjects</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">
            {filteredSubjects.filter((s) => s.category === 'elective').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Average Score</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">
            {filteredSubjects.length > 0
              ? Math.round(
                  Array.from(subjectAverages.values()).reduce((sum, avg) => sum + avg, 0) /
                    filteredSubjects.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Grade Distribution */}
      {reportType === 'grades' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          <div className="space-y-3">
            {Object.entries(gradeDistribution).map(([grade, percentage]) => (
              <div key={grade}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Grade {grade}</span>
                  <span className="text-sm text-gray-600">{percentage}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      grade === 'HP' || grade === 'P'
                        ? 'bg-green-500'
                        : grade === 'AP'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic Report Data */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            {reportTypes.find((t) => t.value === reportType)?.label || 'Academic Report'}
          </h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Academic Year: {academicYear} | Term: {term}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading report data...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No subjects found for selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Level Categories
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Average Score
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm md:text-base font-medium text-gray-900">
                        {subject.name}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {subject.code}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        subject.category === 'core' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {subject.category.charAt(0).toUpperCase() + subject.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {subject.levelCategories && subject.levelCategories.length > 0 ? (
                          subject.levelCategories.map((level) => (
                            <span
                              key={level}
                              className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                            >
                              {level}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No categories</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {subjectAverages.get(subject.id) || 0}%
                        </span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${Math.min(subjectAverages.get(subject.id) || 0, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/academics/subjects/${subject.id}/edit`)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

