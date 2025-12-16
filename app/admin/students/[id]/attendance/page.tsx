'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { Student } from '@/types';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle, TrendingUp, XCircle } from 'lucide-react';
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
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load student data
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }

        // Load attendance records
        const attendanceRes = await fetch(`/api/attendance?studentId=${studentId}`, { credentials: 'include' });
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          const attendanceArray = Array.isArray(attendanceData) ? attendanceData : [];
          
          // Transform attendance data to match interface
          const attendanceRecords: AttendanceRecord[] = attendanceArray.map((att: any) => {
            const presentDays = att.presentDays || 0;
            const totalDays = att.totalDays || 0;
            const absentDays = totalDays - presentDays;
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
            
            return {
              id: att.id,
              term: att.term,
              academicYear: att.academicYear,
              daysPresent: presentDays,
              daysAbsent: absentDays,
              daysLate: 0, // Not used anymore but kept for interface compatibility
              totalDays: totalDays,
              attendanceRate: Math.round(attendanceRate * 10) / 10,
              summary: attendanceRate >= 90 
                ? 'Excellent attendance. Very consistent.'
                : attendanceRate >= 80
                ? 'Good attendance record. Student is consistently present.'
                : attendanceRate >= 70
                ? 'Fair attendance. Some improvement needed.'
                : 'Poor attendance. Requires attention.',
            };
          });
          
          setAttendance(attendanceRecords);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadData();
    }
  }, [studentId]);

  const filteredAttendance = attendance.filter((record) => {
    return selectedTerm === 'all' || record.term.toString() === selectedTerm;
  });

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100';
    if (rate >= 80) return 'text-blue-600 bg-blue-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    if (rate >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getAttendanceStatus = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Good';
    if (rate >= 70) return 'Fair';
    if (rate >= 60) return 'Poor';
    return 'Critical';
  };

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

  const overallStats = filteredAttendance.reduce(
    (acc, record) => {
      acc.totalPresent += record.daysPresent;
      acc.totalAbsent += record.daysAbsent;
      acc.totalLate += record.daysLate;
      acc.totalDays += record.totalDays;
      return acc;
    },
    { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalDays: 0 }
  );

  const overallRate =
    overallStats.totalDays > 0
      ? (overallStats.totalPresent / overallStats.totalDays) * 100
      : 0;

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
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Attendance Records</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {student.firstName} {student.middleName || ''} {student.lastName} - {student.studentId}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Calendar className="h-4 w-4" />
          Term
        </label>
        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="w-full md:w-1/3 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
        >
          <option value="all">All Terms</option>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
      </div>

      {/* Overall Summary */}
      {filteredAttendance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            Overall Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Days</p>
              <p className="text-xl md:text-2xl font-semibold text-gray-900">
                {overallStats.totalDays}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Days Present</p>
              <p className="text-xl md:text-2xl font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle className="h-5 w-5" />
                {overallStats.totalPresent}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Days Absent</p>
              <p className="text-xl md:text-2xl font-semibold text-red-600 flex items-center gap-1">
                <XCircle className="h-5 w-5" />
                {overallStats.totalAbsent}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Attendance Rate</p>
              <p className={`text-xl md:text-2xl font-semibold px-3 py-1 rounded ${getAttendanceColor(overallRate)}`}>
                {overallRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      {filteredAttendance.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No attendance records found for the selected term</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttendance.map((record) => (
            <div key={record.id} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">
                    Term {record.term} - {record.academicYear}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">Attendance Summary</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <p className={`text-sm font-semibold px-3 py-1 rounded ${getAttendanceColor(record.attendanceRate)}`}>
                    {getAttendanceStatus(record.attendanceRate)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium text-green-900">Present</p>
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-green-600">
                    {record.daysPresent}
                  </p>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <p className="text-xs font-medium text-red-900">Absent</p>
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-red-600">
                    {record.daysAbsent}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs font-medium text-yellow-900">Late</p>
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-yellow-600">
                    {record.daysLate}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-blue-900">Total</p>
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-blue-600">
                    {record.totalDays}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-1">Summary</p>
                <p className="text-sm text-gray-600">{record.summary}</p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Attendance Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {record.attendanceRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      record.attendanceRate >= 90
                        ? 'bg-green-600'
                        : record.attendanceRate >= 80
                        ? 'bg-blue-600'
                        : record.attendanceRate >= 70
                        ? 'bg-yellow-600'
                        : record.attendanceRate >= 60
                        ? 'bg-orange-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${record.attendanceRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

