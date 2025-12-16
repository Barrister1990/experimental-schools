'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Class, Student } from '@/types';
import { Filter, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError } = useAlert();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
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

        // Load all students - all teachers can view all students
        const studentsRes = await fetch('/api/students', { credentials: 'include' });
        let relevantStudents: Student[] = [];
        if (studentsRes.ok) {
          relevantStudents = await studentsRes.json();
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
  }, [user?.id]);

  useEffect(() => {
    let filtered = students;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.firstName.toLowerCase().includes(query) ||
          student.lastName.toLowerCase().includes(query) ||
          student.studentId.toLowerCase().includes(query)
      );
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter((student) => student.classId === selectedClass);
    }

    setFilteredStudents(filtered);
  }, [searchQuery, selectedClass, students]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching students..." />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Students</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            View and manage student information
          </p>
        </div>
        {user?.isClassTeacher && (
          <button
            onClick={() => router.push('/teacher/students/new')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Users className="h-4 w-4" />
            Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or student ID..."
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
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            All Students ({filteredStudents.length})
          </h2>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Gender
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
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/teacher/students/${student.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.studentId}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {student.firstName} {student.middleName} {student.lastName}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {studentClass?.name || 'N/A'}
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          student.gender === 'male' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {student.gender === 'male' ? 'Male' : 'Female'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/teacher/students/${student.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
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

