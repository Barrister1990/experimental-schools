'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Mail, Phone, Calendar, User, School, ClipboardList, UserCheck, Shield } from 'lucide-react';
import { User as Teacher, Class } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

export default function TeacherDetailsPage() {
  const router = useRouter();
  const { showError } = useAlert();
  const params = useParams();
  const teacherId = params.id as string;
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const teacherRes = await fetch(`/api/teachers/${teacherId}`, { credentials: 'include' });
        if (!teacherRes.ok) {
          if (teacherRes.status === 404) {
            setTeacher(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to load teacher');
        }

        const teacherData = await teacherRes.json();
        setTeacher(teacherData);

        // If teacher is a class teacher, get their assigned class
        if (teacherData.isClassTeacher || teacherData.role === 'class_teacher') {
          const classesRes = await fetch('/api/classes', { credentials: 'include' });
          if (classesRes.ok) {
            const classes = await classesRes.json();
            const assignedClass = classes.find((c: Class) => c.classTeacherId === teacherData.id);
            if (assignedClass) {
              setClassInfo(assignedClass);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load teacher:', error);
        showError('Failed to load teacher details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) {
      loadTeacher();
    }
  }, [teacherId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

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

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching teacher details..." />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Teacher not found</p>
          <button
            onClick={() => router.push('/admin/teachers')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Teachers
          </button>
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
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900 truncate">
            {teacher.name}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Teacher Details</p>
        </div>
        <button
          onClick={() => router.push(`/admin/teachers/${teacher.id}/edit`)}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit Teacher</span>
        </button>
      </div>

      {/* Teacher Information Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-white">
                {teacher.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                {teacher.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className={`px-3 py-1 text-xs md:text-sm font-medium rounded ${getRoleBadgeColor(teacher.role)}`}>
                  {formatRole(teacher.role)}
                </span>
                <span className={`px-3 py-1 text-xs md:text-sm font-medium rounded ${
                  teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {teacher.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-start gap-2 md:gap-3">
                <Mail className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm md:text-base text-gray-900 truncate">{teacher.email}</p>
                </div>
              </div>

              {teacher.phone && (
                <div className="flex items-start gap-2 md:gap-3">
                  <Phone className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm md:text-base text-gray-900">{teacher.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 md:gap-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm md:text-base text-gray-900">{formatDate(teacher.createdAt)}</p>
                </div>
              </div>

              {classInfo && (
                <div className="flex items-start gap-2 md:gap-3">
                  <School className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Assigned Class</p>
                    <p className="text-sm md:text-base text-gray-900">{classInfo.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => router.push(`/admin/teachers/${teacher.id}/assignments`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <ClipboardList className="h-5 w-5 text-blue-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">View Assignments</h3>
            <p className="text-xs text-gray-600">Class & Subject assignments</p>
          </button>
          <button
            onClick={() => router.push(`/admin/teachers/${teacher.id}/edit`)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Edit className="h-5 w-5 text-orange-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Edit Teacher</h3>
            <p className="text-xs text-gray-600">Update information</p>
          </button>
          {classInfo && (
            <button
              onClick={() => router.push(`/admin/classes/${classInfo.id}`)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <School className="h-5 w-5 text-green-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">View Class</h3>
              <p className="text-xs text-gray-600">Class details</p>
            </button>
          )}
          <button
            onClick={() => router.push('/admin/teachers/permissions')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Shield className="h-5 w-5 text-purple-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Permissions</h3>
            <p className="text-xs text-gray-600">Manage access</p>
          </button>
        </div>
      </div>
    </div>
  );
}

