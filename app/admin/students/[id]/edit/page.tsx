'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { Class, Student } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const studentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], { message: 'Gender is required' }),
  classId: z.string().min(1, 'Class is required'),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'transferred', 'graduated']),
});

type StudentFormData = z.infer<typeof studentSchema>;

export default function EditStudentPage() {
  const router = useRouter();
  const { showError, showSuccess } = useAlert();
  const params = useParams();
  const studentId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentRes, classesRes] = await Promise.all([
          fetch(`/api/students/${studentId}`, { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
        ]);

        if (!studentRes.ok) {
          if (studentRes.status === 404) {
            setStudent(null);
            setLoadingData(false);
            return;
          }
          throw new Error('Failed to load student');
        }

        if (!classesRes.ok) {
          const errorData = await classesRes.json().catch(() => ({}));
          // Don't throw for empty classes, just set empty array
          console.warn('Failed to load classes:', errorData.error);
        }

        const [studentData, classesData] = await Promise.all([
          studentRes.json(),
          classesRes.ok ? classesRes.json() : Promise.resolve([]),
        ]);

        if (studentData) {
          setStudent(studentData);
          // Handle empty array gracefully
          setClasses(Array.isArray(classesData) ? classesData : []);
          
          // Reset form with student data
          reset({
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            middleName: studentData.middleName || '',
            dateOfBirth: new Date(studentData.dateOfBirth).toISOString().split('T')[0],
            gender: studentData.gender,
            classId: studentData.classId,
            parentName: studentData.parentName || '',
            parentPhone: studentData.parentPhone || '',
            address: studentData.address || '',
            status: studentData.status,
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load student data. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    if (studentId) {
      loadData();
    }
  }, [studentId, reset]);

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          classId: data.classId,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          address: data.address,
          status: data.status,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update student');
      }

      showSuccess('Student updated successfully!');
      router.push(`/admin/students/${studentId}`);
    } catch (error: any) {
      console.error('Failed to update student:', error);
      showError(error.message || 'Failed to update student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching student data..." />
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
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Edit Student</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {student.firstName} {student.middleName || ''} {student.lastName} - {student.studentId}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm space-y-6">
        {/* Personal Information */}
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('firstName')}
                type="text"
                id="firstName"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
                Middle Name
              </label>
              <input
                {...register('middleName')}
                type="text"
                id="middleName"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('lastName')}
                type="text"
                id="lastName"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                {...register('dateOfBirth')}
                type="date"
                id="dateOfBirth"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                {...register('gender')}
                id="gender"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                {...register('status')}
                id="status"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="active">Active</option>
                <option value="transferred">Transferred</option>
                <option value="graduated">Graduated</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="classId" className="block text-sm font-medium text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                {...register('classId')}
                id="classId"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="mt-1 text-xs text-red-600">{errors.classId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Parent/Guardian Information */}
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 mb-1">
                Parent/Guardian Name
              </label>
              <input
                {...register('parentName')}
                type="text"
                id="parentName"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div>
              <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Parent/Guardian Phone
              </label>
              <input
                {...register('parentPhone')}
                type="tel"
                id="parentPhone"
                placeholder="+233XXXXXXXXX"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                {...register('address')}
                type="text"
                id="address"
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
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
        </div>
      </form>
    </div>
  );
}

