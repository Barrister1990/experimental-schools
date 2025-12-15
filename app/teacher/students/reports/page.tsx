'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Search, Filter, FileText, Download, Calendar } from 'lucide-react';
import { Student, Class } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';

export default function StudentReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError, showInfo } = useAlert();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load classes first
        const classesRes = await fetch('/api/classes', { credentials: 'include' });
        if (!classesRes.ok) {
          throw new Error('Failed to load classes');
        }
        const allClasses = await classesRes.json();
        setClasses(Array.isArray(allClasses) ? allClasses : []);

        // Filter students based on teacher role
        let relevantStudents: Student[] = [];
        
        if (user?.isClassTeacher) {
          // Class teachers see students in their assigned class(es)
          const teacherClassesRes = await fetch(`/api/classes/teacher/${user.id}`, { credentials: 'include' });
          if (teacherClassesRes.ok) {
            const teacherClasses = await teacherClassesRes.json();
            const myClassIds = Array.isArray(teacherClasses) ? teacherClasses.map((c: Class) => c.id) : [];
            
            // Load students for each class
            const studentPromises = myClassIds.map((classId: string) =>
              fetch(`/api/students?classId=${classId}`, { credentials: 'include' })
            );
            const studentResponses = await Promise.all(studentPromises);
            const studentDataArrays = await Promise.all(
              studentResponses.map((res) => res.ok ? res.json() : Promise.resolve([]))
            );
            relevantStudents = studentDataArrays.flat();
          }
        } else {
          // Subject teachers see all students (they teach across classes)
          const studentsRes = await fetch('/api/students', { credentials: 'include' });
          if (studentsRes.ok) {
            relevantStudents = await studentsRes.json();
          }
        }

        setStudents(Array.isArray(relevantStudents) ? relevantStudents : []);
        setFilteredStudents(Array.isArray(relevantStudents) ? relevantStudents : []);
      } catch (error: any) {
        console.error('Failed to load students:', error);
        showError(error.message || 'Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, user?.isClassTeacher]);

  useEffect(() => {
    let filtered = students;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.firstName.toLowerCase().includes(query) ||
          student.lastName.toLowerCase().includes(query) ||
          student.studentId.toLowerCase().includes(query)
      );
    }

    if (selectedClass !== 'all') {
      filtered = filtered.filter((student) => student.classId === selectedClass);
    }

    setFilteredStudents(filtered);
  }, [searchQuery, selectedClass, students]);

  const handleGenerateReport = (studentId: string) => {
    // In real app, this would generate a PDF report
    showInfo(`Generating report for student ${studentId}...`);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching report data..." />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Student Reports</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          Generate and view student reports
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            />
          </div>
          <div>
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
          </div>
          <div>
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

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            Students ({filteredStudents.length})
          </h2>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm md:text-base text-gray-600">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Class
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const studentClass = classes.find((c) => c.id === student.classId);

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.studentId}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {student.firstName} {student.middleName} {student.lastName}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {studentClass?.name || 'N/A'}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleGenerateReport(student.id)}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Generate Report
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
    </div>
  );
}

