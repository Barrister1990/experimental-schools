'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, UserCheck } from 'lucide-react';
import { User, UserRole } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

const teacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  isClassTeacher: z.boolean(),
  isSubjectTeacher: z.boolean(),
  isActive: z.boolean(),
}).refine((data) => data.isClassTeacher || data.isSubjectTeacher, {
  message: 'Teacher must have at least one role (Class Teacher or Subject Teacher)',
  path: ['isClassTeacher'],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function EditTeacherPage() {
  const router = useRouter();
  const { showError, showSuccess } = useAlert();
  const params = useParams();
  const teacherId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      isClassTeacher: false,
      isSubjectTeacher: false,
      isActive: true,
    },
  });

  const isClassTeacher = watch('isClassTeacher');
  const isSubjectTeacher = watch('isSubjectTeacher');

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const teacherRes = await fetch(`/api/teachers/${teacherId}`, { credentials: 'include' });
        if (!teacherRes.ok) {
          if (teacherRes.status === 404) {
            setLoading(false);
            return;
          }
          throw new Error('Failed to load teacher');
        }

        const teacher = await teacherRes.json();
        if (teacher) {
          setValue('name', teacher.name);
          setValue('email', teacher.email);
          setValue('phone', teacher.phone || '');
          setValue('isActive', teacher.isActive);
          setValue('isClassTeacher', teacher.isClassTeacher || teacher.role === 'class_teacher');
          setValue('isSubjectTeacher', teacher.isSubjectTeacher || teacher.role === 'subject_teacher');
        }
      } catch (error) {
        console.error('Failed to load teacher:', error);
        showError('Failed to load teacher data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) {
      loadTeacher();
    }
  }, [teacherId, setValue]);

  const onSubmit = async (data: TeacherFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          isClassTeacher: data.isClassTeacher,
          isSubjectTeacher: data.isSubjectTeacher,
          isActive: data.isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update teacher');
      }

      showSuccess('Teacher updated successfully!');
      router.push(`/admin/teachers/${teacherId}`);
    } catch (error: any) {
      console.error('Failed to update teacher:', error);
      showError(error.message || 'Failed to update teacher. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching teacher data..." />
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
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Edit Teacher</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Update teacher information</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                disabled
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-base"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                {...register('isActive', { 
                  setValueAs: (v) => v === 'true' || v === true 
                })}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Roles</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isClassTeacher"
                {...register('isClassTeacher')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="isClassTeacher" className="block text-sm font-medium text-gray-700 cursor-pointer">
                  Class Teacher
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Can manage a class, add students, record attendance, and conduct evaluations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isSubjectTeacher"
                {...register('isSubjectTeacher')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="isSubjectTeacher" className="block text-sm font-medium text-gray-700 cursor-pointer">
                  Subject Teacher
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Can grade students in assigned subjects and create assessments
                </p>
              </div>
            </div>

            {errors.isClassTeacher && (
              <p className="text-xs text-red-600">{errors.isClassTeacher.message}</p>
            )}
          </div>
        </div>

        {/* Role-Specific Information */}
        {isClassTeacher && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
            <div className="flex items-start gap-2">
              <UserCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Class Teacher</h3>
                <p className="text-xs text-blue-700">
                  Class assignments can be managed from the{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/admin/teachers/assignments')}
                    className="underline font-medium"
                  >
                    Assignments page
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {isSubjectTeacher && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
            <div className="flex items-start gap-2">
              <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-900 mb-1">Subject Teacher</h3>
                <p className="text-xs text-green-700">
                  Subject assignments can be managed from the{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/admin/teachers/assignments')}
                    className="underline font-medium"
                  >
                    Assignments page
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

