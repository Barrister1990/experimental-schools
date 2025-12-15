'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { Class, Student } from '@/types';
import { ClipboardList, FileUp, Filter, MoreVertical, Plus, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StudentsPage() {
  const router = useRouter();
  const { showError } = useAlert();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, classesRes] = await Promise.all([
          fetch('/api/students', { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
        ]);

        // Check for errors but handle empty results gracefully
        if (!studentsRes.ok) {
          const errorData = await studentsRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load students');
        }
        if (!classesRes.ok) {
          const errorData = await classesRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load classes');
        }

        const [studentsData, classesData] = await Promise.all([
          studentsRes.json(),
          classesRes.json(),
        ]);

        // Handle empty arrays gracefully
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch (error: any) {
        console.error('Failed to load data:', error);
        // Only show alert for actual errors
        if (error.message && !error.message.includes('empty')) {
          showError(error.message || 'Failed to load data. Please try again.');
        }
        // Set empty arrays on error to prevent UI issues
        setStudents([]);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getClassName = (classId: string) => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem?.name || 'Unknown';
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || student.classId === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">All Students</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage and view all student information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/students/import')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FileUp className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => router.push('/admin/students/new')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Student</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or student ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
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

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <TikTokLoader text="Fetching students..." />
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No students found</p>
            <button
              onClick={() => router.push('/admin/students/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Student ID
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Gender
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Enrollment Date
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => router.push(`/admin/students/${student.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs md:text-sm font-medium text-blue-600">
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm md:text-base font-medium text-gray-900 truncate">
                            {student.firstName} {student.middleName} {student.lastName}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {student.studentId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {student.studentId}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {getClassName(student.classId)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize hidden lg:table-cell">
                      {student.gender}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      {formatDate(student.enrollmentDate)}
                    </td>
                    <td 
                      className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === student.id ? null : student.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        {openMenu === student.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  router.push(`/admin/students/${student.id}`);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                              >
                                <User className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  router.push(`/admin/students/${student.id}/grades`);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                              >
                                <ClipboardList className="h-4 w-4" />
                                View Grades
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredStudents.length > 0 && (
        <div className="text-xs md:text-sm text-gray-600 text-center">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      )}
    </div>
  );
}

