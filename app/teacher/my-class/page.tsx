'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Award, 
  TrendingUp,
  UserCheck,
  BookOpen,
  FileText,
  Plus,
  Edit
} from 'lucide-react';
import { Class, Student } from '@/types';
import { getLevelName } from '@/lib/utils/class-levels';
import { useAlert } from '@/components/shared/AlertProvider';

export default function MyClassPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError } = useAlert();
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadClassData = async () => {
      try {
        // Get classes assigned to this teacher
        const classesRes = await fetch(`/api/classes/teacher/${user.id}`, { credentials: 'include' });
        if (!classesRes.ok) {
          throw new Error('Failed to load classes');
        }
        const teacherClasses = await classesRes.json();
        
        // Get the first class (or handle multiple classes if needed)
        const myClass = Array.isArray(teacherClasses) && teacherClasses.length > 0 ? teacherClasses[0] : null;

        if (myClass) {
          setClassInfo(myClass);
          
          // Load students for this class
          const studentsRes = await fetch(`/api/students?classId=${myClass.id}`, { credentials: 'include' });
          if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            setStudents(Array.isArray(studentsData) ? studentsData : []);
          } else {
            setStudents([]);
          }
        }
      } catch (error: any) {
        console.error('Failed to load class data:', error);
        showError(error.message || 'Failed to load class data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadClassData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching class data..." />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="p-3 bg-gray-100 rounded-full">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
            No Class Assigned
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            You don't have a class assigned yet. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push('/teacher/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">My Class</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage your class and students
          </p>
        </div>
      </div>

      {/* Class Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Class Name</p>
            <p className="text-sm md:text-base font-medium text-gray-900">{classInfo.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Level</p>
            <p className="text-sm md:text-base font-medium text-gray-900">{getLevelName(classInfo.level)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Students</p>
            <p className="text-sm md:text-base font-medium text-gray-900">
              {students.length} / {classInfo.capacity}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Academic Year</p>
            <p className="text-sm md:text-base font-medium text-gray-900">N/A</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => router.push('/teacher/my-class/attendance')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">Record Attendance</h3>
            <p className="text-[10px] md:text-xs text-gray-600">Enter attendance summary</p>
          </button>

          <button
            onClick={() => router.push('/teacher/my-class/conduct')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <Award className="h-5 w-5 md:h-6 md:w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">Conduct & Interest</h3>
            <p className="text-[10px] md:text-xs text-gray-600">Evaluate students</p>
          </button>

          <button
            onClick={() => router.push('/teacher/grades/enter')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">Enter Grades</h3>
            <p className="text-[10px] md:text-xs text-gray-600">Add student grades</p>
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Students ({students.length})</h2>
          <button
            onClick={() => router.push('/teacher/students')}
            className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All
            <ArrowLeft className="h-3 w-3 rotate-180" />
          </button>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm md:text-base">No students enrolled in this class yet.</p>
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
                    Gender
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Enrollment Date
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
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
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        student.gender === 'male' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {student.gender === 'male' ? 'Male' : 'Female'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      {student.enrollmentDate 
                        ? (student.enrollmentDate instanceof Date 
                            ? student.enrollmentDate.toLocaleDateString() 
                            : new Date(student.enrollmentDate).toLocaleDateString())
                        : 'N/A'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

