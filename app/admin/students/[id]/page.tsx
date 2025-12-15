'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { beceService, type BECEResult } from '@/lib/services/bece-service';
import { Class, Student } from '@/types';
import { ArrowLeft, Calendar, ClipboardList, Edit, FileUp, GraduationCap, MapPin, Phone, School, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StudentDetailsPage() {
  const router = useRouter();
  const { showError } = useAlert();
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [beceResults, setBeceResults] = useState<BECEResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (!studentRes.ok) {
          if (studentRes.status === 404) {
            setStudent(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to load student');
        }

        const studentData = await studentRes.json();
        setStudent(studentData);

        if (studentData.classId) {
          const classRes = await fetch(`/api/classes/${studentData.classId}`, { credentials: 'include' });
          if (classRes.ok) {
            const classData = await classRes.json();
            setClassInfo(classData);
          }
        }

        // Load BECE results if student is graduated
        if (studentData.status === 'graduated') {
          const beceRes = await fetch(`/api/bece-results/student/${studentId}`, { credentials: 'include' });
          if (beceRes.ok) {
            const beceData = await beceRes.json();
            setBeceResults(Array.isArray(beceData) ? beceData : []);
          }
        }
      } catch (error) {
        console.error('Failed to load student:', error);
        showError('Failed to load student details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadStudent();
    }
  }, [studentId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

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
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Student not found</p>
          <button
            onClick={() => router.push('/admin/students')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <button
          onClick={() => router.push(`/admin/students/${student.id}/edit`)}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      </div>

      {/* Student Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-600" />
            Personal Information
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Full Name</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {student.firstName} {student.middleName} {student.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Date of Birth</p>
              <p className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(student.dateOfBirth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Gender</p>
              <p className="text-sm md:text-base font-medium text-gray-900 capitalize">
                {student.gender}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                student.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : student.status === 'transferred'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <School className="h-5 w-5 text-gray-600" />
            Academic Information
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Class</p>
              <p className="text-sm md:text-base font-medium text-gray-900">
                {classInfo?.name || 'Not assigned'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Enrollment Date</p>
              <p className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(student.enrollmentDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Student ID</p>
              <p className="text-sm md:text-base font-medium text-gray-900 font-mono">
                {student.studentId}
              </p>
            </div>
          </div>
        </div>

        {/* Parent/Guardian Information */}
        {(student.parentName || student.parentPhone || student.address) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm md:col-span-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.parentName && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Name</p>
                  <p className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {student.parentName}
                  </p>
                </div>
              )}
              {student.parentPhone && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Phone</p>
                  <p className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {student.parentPhone}
                  </p>
                </div>
              )}
              {student.address && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Address</p>
                  <p className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {student.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BECE Results - Only show for graduated students */}
      {student.status === 'graduated' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-green-600" />
            BECE Results
          </h2>
          {beceResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No BECE results recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-0">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-3 md:px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                        Remark
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {beceResults.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 md:px-4 py-3 text-sm font-medium text-gray-900">
                          {result.subject}
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {result.grade}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {result.remark || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {beceResults.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Aggregate:</span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded ${
                      (() => {
                        const aggregate = beceService.calculateAggregate(beceResults);
                        if (aggregate === null) return 'bg-gray-100 text-gray-600';
                        if (aggregate <= 12) return 'bg-green-100 text-green-800';
                        if (aggregate <= 18) return 'bg-blue-100 text-blue-800';
                        if (aggregate <= 24) return 'bg-yellow-100 text-yellow-800';
                        return 'bg-orange-100 text-orange-800';
                      })()
                    }`}>
                      {beceService.calculateAggregate(beceResults) ?? 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => router.push(`/admin/students/${student.id}/grades`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <ClipboardList className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">View Grades</h3>
            <p className="text-xs text-gray-600">View all grades and assessments</p>
          </button>
          <button
            onClick={() => router.push(`/admin/students/${student.id}/attendance`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Calendar className="h-5 w-5 text-green-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Attendance</h3>
            <p className="text-xs text-gray-600">View attendance records</p>
          </button>
          <button
            onClick={() => router.push(`/admin/students/${student.id}/reports`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <FileUp className="h-5 w-5 text-purple-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Reports</h3>
            <p className="text-xs text-gray-600">Generate reports</p>
          </button>
          <button
            onClick={() => router.push(`/admin/students/${student.id}/edit`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Edit className="h-5 w-5 text-orange-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Edit Student</h3>
            <p className="text-xs text-gray-600">Update information</p>
          </button>
        </div>
      </div>
    </div>
  );
}

