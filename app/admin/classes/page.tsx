'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import TikTokLoader from '@/components/TikTokLoader';
import { getLevelName } from '@/lib/utils/class-levels';
import { Class } from '@/types';
import { Edit, GraduationCap, MoreVertical, Plus, School, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClassesPage() {
  const router = useRouter();
  const { showError } = useAlert();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetch('/api/classes', { credentials: 'include' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load classes');
        }
        const data = await res.json();
        // Handle empty array gracefully
        setClasses(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error('Failed to load classes:', error);
        // Only show alert for actual errors, not empty results
        if (error.message && !error.message.includes('empty')) {
          showError(error.message || 'Failed to load classes. Please try again.');
        }
        setClasses([]); // Set empty array on error to prevent UI issues
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  const filteredClasses = classes.filter((cls) => {
    return cls.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">All Classes</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage classes and class assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/classes/assignments')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </button>
          <button
            onClick={() => router.push('/admin/classes/promotions')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Promotions</span>
          </button>
          <button
            onClick={() => router.push('/admin/classes/new')}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Class</span>
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
            placeholder="Search classes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {loading ? (
          <div className="col-span-full">
            <TikTokLoader text="Fetching classes..." />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full p-8 text-center">
            <p className="text-gray-500 mb-4">No classes found</p>
            <button
              onClick={() => router.push('/admin/classes/new')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Class
            </button>
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/admin/classes/${cls.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <School className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-xs md:text-sm text-gray-600">{cls.academicYear}</p>
                  </div>
                </div>
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative"
                >
                  <button
                    onClick={() => setOpenMenu(openMenu === cls.id ? null : cls.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  {openMenu === cls.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            router.push(`/admin/classes/${cls.id}`);
                            setOpenMenu(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                        >
                          <School className="h-4 w-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/admin/classes/${cls.id}/edit`);
                            setOpenMenu(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Class
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Students</span>
                  <span className="font-medium text-gray-900">
                    {cls.studentCount} / {cls.capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(cls.studentCount / cls.capacity) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Term</span>
                  <span className="font-medium text-gray-900">Term {cls.term}</span>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Level</span>
                  <span className="font-medium text-gray-900">{getLevelName(cls.level)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {!loading && filteredClasses.length > 0 && (
        <div className="text-xs md:text-sm text-gray-600 text-center">
          Showing {filteredClasses.length} of {classes.length} classes
        </div>
      )}
    </div>
  );
}

