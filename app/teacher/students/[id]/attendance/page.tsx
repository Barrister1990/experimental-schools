'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { Attendance } from '@/lib/services/attendance-service';
import { Student } from '@/types';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AttendanceRecord {
  id: string;
  term: number;
  academicYear: string;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalDays: number;
  attendanceRate: number;
  summary: string;
}

export default function StudentAttendancePage() {
  const router = useRouter();
  const { showError } = useAlert();
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }

        // Load attendance records
        const attendanceRes = await fetch(`/api/attendance?studentId=${studentId}`, { credentials: 'include' });
        if (attendanceRes.ok) {
          const attendanceData: Attendance[] = await attendanceRes.json();
          const attendanceRecords: AttendanceRecord[] = attendanceData.map((att) => ({
            id: att.id,
            term: att.term,
            academicYear: att.academicYear,
            daysPresent: att.presentDays,
            daysAbsent: att.absentDays,
            daysLate: att.lateDays,
            totalDays: att.totalDays,
            attendanceRate: Math.round(att.attendancePercentage),
            summary: `Present: ${att.presentDays}/${att.totalDays} days (${Math.round(att.attendancePercentage)}%)`,
          }));
          setAttendance(attendanceRecords);
        } else {
          // No attendance records yet
          setAttendance([]);
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadData();
    }
  }, [studentId, selectedTerm]);

  const filteredAttendance = selectedTerm === 'all'
    ? attendance
    : attendance.filter((a) => a.term.toString() === selectedTerm);

  const overallStats = attendance.reduce(
    (acc, record) => ({
      totalDays: acc.totalDays + record.totalDays,
      presentDays: acc.presentDays + record.daysPresent,
      absentDays: acc.absentDays + record.daysAbsent,
      lateDays: acc.lateDays + record.daysLate,
    }),
    { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0 }
  );

  const overallRate = overallStats.totalDays > 0
    ? Math.round((overallStats.presentDays / overallStats.totalDays) * 100)
    : 0;

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching attendance records..." />
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
          onClick={() => router.push(`/teacher/students/${studentId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Attendance Records</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {student.firstName} {student.middleName || ''} {student.lastName} - {student.studentId}
          </p>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Overall Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Days</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900">{overallStats.totalDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Present</p>
            <p className="text-lg md:text-2xl font-semibold text-green-600">{overallStats.presentDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Absent</p>
            <p className="text-lg md:text-2xl font-semibold text-red-600">{overallStats.absentDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
            <p className={`text-lg md:text-2xl font-semibold ${
              overallRate >= 90 ? 'text-green-600' :
              overallRate >= 80 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {overallRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Term Filter */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Term:</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
          >
            <option value="all">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="space-y-4">
        {filteredAttendance.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm md:text-base text-gray-600">No attendance records found</p>
          </div>
        ) : (
          filteredAttendance.map((record) => (
            <div key={record.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    Term {record.term} - {record.academicYear}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">{record.summary}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  record.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                  record.attendanceRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {record.attendanceRate >= 90 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : record.attendanceRate >= 80 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">{record.attendanceRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Days</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{record.totalDays}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Present</p>
                  <p className="text-sm md:text-base font-medium text-green-600">{record.daysPresent}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Absent</p>
                  <p className="text-sm md:text-base font-medium text-red-600">{record.daysAbsent}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Late</p>
                  <p className="text-sm md:text-base font-medium text-yellow-600">{record.daysLate}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    record.attendanceRate >= 90 ? 'bg-green-600' :
                    record.attendanceRate >= 80 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${record.attendanceRate}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

