'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, School, UserCheck, Users } from 'lucide-react';
import { Class, User } from '@/types';
import { getLevelName } from '@/lib/utils/class-levels';

export default function ClassAssignmentsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesRes, teachersRes] = await Promise.all([
          fetch('/api/classes', { credentials: 'include' }),
          fetch('/api/teachers', { credentials: 'include' }),
        ]);

        let classesData: Class[] = [];
        let teachersData: User[] = [];

        if (classesRes.ok) {
          const data = await classesRes.json();
          classesData = Array.isArray(data) ? data : [];
        }

        if (teachersRes.ok) {
          const data = await teachersRes.json();
          teachersData = Array.isArray(data) ? data : [];
        }

        setClasses(classesData);
        setTeachers(teachersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher?.name || 'Unassigned';
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching assignments..." />
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
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Class Assignments</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            View and manage class teacher assignments
          </p>
        </div>
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">All Classes</h2>
        </div>
        {classes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No classes found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => router.push(`/admin/classes/${cls.id}`)}
                className="p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <School className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                        {cls.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                        <span>Level: {getLevelName(cls.level)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          Class Teacher: <span className="font-medium">{getTeacherName(cls.classTeacherId)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

