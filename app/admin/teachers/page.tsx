'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { User } from '@/types';
import { AlertCircle, CheckCircle, ClipboardList, Edit, MoreVertical, Plus, Search, Trash2, UserCheck, User as UserIcon, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TeacherPerformance {
  teacherId: string;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  assignedClass?: string | null;
  totalStudents?: number;
  evaluationsDone?: number;
  evaluationsTotal?: number;
  attendanceEntered?: number;
  attendanceTotal?: number;
  assignedSubjects?: number;
  subjectsGraded?: number;
  subjectsTotal?: number;
  performanceScore: number;
}

export default function TeachersPage() {
  const router = useRouter();
  const { showError, showSuccess, showWarning, showAlert } = useAlert();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [performanceData, setPerformanceData] = useState<Record<string, TeacherPerformance>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersRes = await fetch('/api/teachers', { credentials: 'include' });
        if (!teachersRes.ok) {
          const errorData = await teachersRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load teachers');
        }

        const data = await teachersRes.json();
        setTeachers(Array.isArray(data) ? data : []);

        // Load performance data for each teacher
        const performance: Record<string, TeacherPerformance> = {};
        for (const teacher of data) {
          try {
            const perfRes = await fetch(`/api/teachers/performance/${teacher.id}`, { credentials: 'include' });
            if (perfRes.ok) {
              const perf = await perfRes.json();
              if (perf) {
                performance[teacher.id] = perf;
              }
            }
          } catch (error) {
            console.warn(`Failed to load performance for teacher ${teacher.id}:`, error);
          }
        }
        setPerformanceData(performance);
      } catch (error: any) {
        console.error('Failed to load teachers:', error);
        if (error.message && !error.message.includes('empty')) {
          showError(error.message || 'Failed to load teachers. Please try again.');
        }
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeachers();
  }, []);

  const filteredTeachers = teachers.filter((teacher) => {
    return (
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'class_teacher':
        return 'bg-green-100 text-green-800';
      case 'subject_teacher':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getPerformanceStatus = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Excellent' };
    if (score >= 60) return { color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle, label: 'Good' };
    if (score >= 40) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle, label: 'Fair' };
    return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Needs Attention' };
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    showAlert({
      title: 'Delete Teacher',
      message: `Are you sure you want to delete ${teacherName}? This action cannot be undone.`,
      type: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDeletingTeacherId(teacherId);
        try {
          const res = await fetch(`/api/teachers/${teacherId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete teacher');
          }

          showSuccess('Teacher deleted successfully!');
          // Remove teacher from list
          setTeachers(teachers.filter(t => t.id !== teacherId));
          // Remove performance data
          const newPerformanceData = { ...performanceData };
          delete newPerformanceData[teacherId];
          setPerformanceData(newPerformanceData);
        } catch (error: any) {
          console.error('Failed to delete teacher:', error);
          showError(error.message || 'Failed to delete teacher. Please try again.');
        } finally {
          setDeletingTeacherId(null);
          setOpenMenu(null);
        }
      },
    });
  };

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">All Teachers</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage teachers and their assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/teachers/assignments')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </button>
          <button
            onClick={() => router.push('/admin/teachers/new')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Teacher</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <TikTokLoader text="Fetching teachers..." />
        ) : filteredTeachers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No teachers found</p>
            <button
              onClick={() => router.push('/admin/teachers/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Teacher
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Email
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Phone
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                    Performance
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTeachers.map((teacher) => (
                  <tr 
                    key={teacher.id} 
                    onClick={() => router.push(`/admin/teachers/${teacher.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs md:text-sm font-medium text-white">
                            {teacher.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm md:text-base font-medium text-gray-900 truncate">
                              {teacher.name}
                            </span>
                            {performanceData[teacher.id] && (
                              <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                getPerformanceStatus(performanceData[teacher.id].performanceScore).bg
                              } ${
                                getPerformanceStatus(performanceData[teacher.id].performanceScore).color
                              }`}>
                                {performanceData[teacher.id].performanceScore}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {teacher.email}
                            {performanceData[teacher.id] && (
                              <span className="ml-2">
                                • {performanceData[teacher.id].performanceScore}% complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {teacher.email}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(teacher.role)}`}>
                        {formatRole(teacher.role)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      {teacher.phone || 'N/A'}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                      {performanceData[teacher.id] ? (
                        <div className="space-y-1">
                          {performanceData[teacher.id].isClassTeacher && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Class:</span>{' '}
                              {performanceData[teacher.id].evaluationsDone !== undefined && (
                                <>
                                  Eval: {performanceData[teacher.id].evaluationsDone}/{performanceData[teacher.id].evaluationsTotal}{' '}
                                  • Att: {performanceData[teacher.id].attendanceEntered}/{performanceData[teacher.id].attendanceTotal}
                                </>
                              )}
                            </div>
                          )}
                          {performanceData[teacher.id].isSubjectTeacher && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Subjects:</span>{' '}
                              {performanceData[teacher.id].subjectsGraded !== undefined && (
                                <>
                                  {performanceData[teacher.id].subjectsGraded}/{performanceData[teacher.id].subjectsTotal} graded
                                </>
                              )}
                            </div>
                          )}
                          {(() => {
                            const status = getPerformanceStatus(performanceData[teacher.id].performanceScore);
                            const StatusIcon = status.icon;
                            return (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {performanceData[teacher.id].performanceScore}% - {status.label}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No data</span>
                      )}
                    </td>
                    <td 
                      className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === teacher.id ? null : teacher.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        {openMenu === teacher.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  router.push(`/admin/teachers/${teacher.id}`);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                              >
                                <UserIcon className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  router.push(`/admin/teachers/${teacher.id}/assignments`);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                              >
                                <ClipboardList className="h-4 w-4" />
                                View Assignments
                              </button>
                              <button
                                onClick={() => {
                                  router.push(`/admin/teachers/${teacher.id}/edit`);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Teacher
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteTeacher(teacher.id, teacher.name);
                                }}
                                disabled={deletingTeacherId === teacher.id}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingTeacherId === teacher.id ? 'Deleting...' : 'Delete Teacher'}
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
      {!loading && filteredTeachers.length > 0 && (
        <div className="text-xs md:text-sm text-gray-600 text-center">
          Showing {filteredTeachers.length} of {teachers.length} teachers
        </div>
      )}
    </div>
  );
}

