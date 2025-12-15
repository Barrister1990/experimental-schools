'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Search, Users, Filter, ArrowRight } from 'lucide-react';
import { Student, Class } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

export default function StudentProfilesPage() {
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

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching student profiles..." />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Student Profiles</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          View detailed student profiles and information
        </p>
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

      {/* Student Cards */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm md:text-base text-gray-600">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredStudents.map((student) => {
            const studentClass = classes.find((c) => c.id === student.classId);

            return (
              <div
                key={student.id}
                onClick={() => router.push(`/teacher/students/${student.id}`)}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                      {student.firstName} {student.middleName} {student.lastName}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">{student.studentId}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    student.gender === 'male' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-pink-100 text-pink-800'
                  }`}>
                    {student.gender === 'male' ? 'M' : 'F'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <span className="font-medium">Class:</span>
                    <span>{studentClass?.name || 'N/A'}</span>
                  </div>
                  {student.parentName && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <span className="font-medium">Parent:</span>
                      <span>{student.parentName}</span>
                    </div>
                  )}
                  {student.parentPhone && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>
                      <span>{student.parentPhone}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/teacher/students/${student.id}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs md:text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  View Profile
                  <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

