'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, Award, Calendar, User, Phone, MapPin } from 'lucide-react';
import { Student, Class } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

export default function StudentDetailsPage() {
  const router = useRouter();
  const { showError } = useAlert();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (!studentRes.ok) {
          throw new Error('Failed to load student');
        }
        const studentData = await studentRes.json();
        
        if (studentData) {
          setStudent(studentData);
          
          // Load class info
          const classRes = await fetch(`/api/classes/${studentData.classId}`, { credentials: 'include' });
          if (classRes.ok) {
            const classData = await classRes.json();
            setClassInfo(classData);
          }
        }
      } catch (error: any) {
        console.error('Failed to load student data:', error);
        showError(error.message || 'Failed to load student data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadData();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching student details..." />
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
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">
            {student.firstName} {student.middleName} {student.lastName}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Student ID: {student.studentId}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => router.push(`/teacher/students/${studentId}/grades`)}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">View Grades</h3>
            <p className="text-[10px] md:text-xs text-gray-600">Academic performance</p>
          </button>

          <button
            onClick={() => router.push(`/teacher/students/${studentId}/attendance`)}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">Attendance</h3>
            <p className="text-[10px] md:text-xs text-gray-600">View attendance records</p>
          </button>

          <button
            onClick={() => router.push(`/teacher/students/${studentId}/reports`)}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <Award className="h-5 w-5 md:h-6 md:w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-1">Reports</h3>
            <p className="text-[10px] md:text-xs text-gray-600">Generate reports</p>
          </button>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-3 md:space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Full Name</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {student.firstName} {student.middleName} {student.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Student ID</p>
              <p className="text-sm md:text-base font-medium text-gray-900">{student.studentId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {student.dateOfBirth 
                  ? (student.dateOfBirth instanceof Date 
                      ? student.dateOfBirth.toLocaleDateString() 
                      : new Date(student.dateOfBirth).toLocaleDateString())
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Gender</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                student.gender === 'male' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-pink-100 text-pink-800'
              }`}>
                {student.gender === 'male' ? 'Male' : 'Female'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-sm md:text-base font-medium text-gray-900">{student.address}</p>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
          <div className="space-y-3 md:space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Class</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {classInfo?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Enrollment Date</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {student.enrollmentDate 
                  ? (student.enrollmentDate instanceof Date 
                      ? student.enrollmentDate.toLocaleDateString() 
                      : new Date(student.enrollmentDate).toLocaleDateString())
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                student.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {student.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Parent/Guardian Information */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 lg:col-span-2">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" /> Name
              </p>
              <p className="text-sm md:text-base font-medium text-gray-900">{student.parentName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </p>
              <p className="text-sm md:text-base font-medium text-gray-900">{student.parentPhone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

