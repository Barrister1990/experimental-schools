'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Check, X, Save, Loader2 } from 'lucide-react';
import { User } from '@/types';
import { useAlert } from '@/components/shared/AlertProvider';

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
}

export default function TeacherPermissionsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useAlert();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherPermissions, setTeacherPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load teachers
        const teachersRes = await fetch('/api/teachers', { credentials: 'include' });
        if (!teachersRes.ok) {
          throw new Error('Failed to load teachers');
        }
        const teachersData = await teachersRes.json();
        setTeachers(Array.isArray(teachersData) ? teachersData : []);

        // Load permissions
        const permissionsRes = await fetch('/api/permissions', { credentials: 'include' });
        if (!permissionsRes.ok) {
          throw new Error('Failed to load permissions');
        }
        const permissionsData = await permissionsRes.json();
        setPermissions(Array.isArray(permissionsData) ? permissionsData : []);

        // Load permissions for each teacher
        const initialPermissions: Record<string, string[]> = {};
        for (const teacher of teachersData) {
          const userPermsRes = await fetch(`/api/permissions/user/${teacher.id}`, { credentials: 'include' });
          if (userPermsRes.ok) {
            const userPerms = await userPermsRes.json();
            initialPermissions[teacher.id] = Array.isArray(userPerms) ? userPerms : [];
          } else {
            // Default permissions based on role
            if (teacher.isClassTeacher) {
              initialPermissions[teacher.id] = [
                'view_students',
                'add_students',
                'edit_students',
                'view_grades',
                'enter_grades',
                'create_assessments',
                'view_reports',
              ];
            } else if (teacher.isSubjectTeacher) {
              initialPermissions[teacher.id] = [
                'view_students',
                'view_grades',
                'enter_grades',
                'create_assessments',
              ];
            } else {
              initialPermissions[teacher.id] = [];
            }
          }
        }
        setTeacherPermissions(initialPermissions);
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showError(error.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const togglePermission = (teacherId: string, permissionId: string) => {
    setTeacherPermissions((prev) => {
      const current = prev[teacherId] || [];
      if (current.includes(permissionId)) {
        return {
          ...prev,
          [teacherId]: current.filter((p) => p !== permissionId),
        };
      } else {
        return {
          ...prev,
          [teacherId]: [...current, permissionId],
        };
      }
    });
  };

  const hasPermission = (teacherId: string, permissionId: string) => {
    return teacherPermissions[teacherId]?.includes(permissionId) || false;
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const savePermissions = async () => {
    setSaving(true);
    try {
      const savePromises = Object.keys(teacherPermissions).map((teacherId) =>
        fetch(`/api/permissions/user/${teacherId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            permissionCodes: teacherPermissions[teacherId],
          }),
        })
      );

      const results = await Promise.all(savePromises);
      const failed = results.filter((res) => !res.ok);

      if (failed.length > 0) {
        throw new Error('Failed to save some permissions');
      }

      showSuccess('Permissions saved successfully!');
    } catch (error: any) {
      console.error('Failed to save permissions:', error);
      showError(error.message || 'Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Teacher Permissions</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage permissions and access control for teachers
          </p>
        </div>
      </div>

      {/* Teacher Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Teacher
        </label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="w-full md:w-1/2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
        >
          <option value="">All Teachers</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.role.replace('_', ' ')})
            </option>
          ))}
        </select>
      </div>

      {/* Permissions Grid */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <TikTokLoader text="Fetching permissions..." />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                {category}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-0">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Permission
                      </th>
                      {teachers
                        .filter((t) => !selectedTeacher || t.id === selectedTeacher)
                        .map((teacher) => (
                          <th
                            key={teacher.id}
                            className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[120px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {teacher.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-600 truncate max-w-[100px]">
                                {teacher.name.split(' ')[0]}
                              </span>
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {perms.map((permission) => (
                      <tr key={permission.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                            <p className="text-xs text-gray-600">{permission.description}</p>
                          </div>
                        </td>
                        {teachers
                          .filter((t) => !selectedTeacher || t.id === selectedTeacher)
                          .map((teacher) => (
                            <td key={teacher.id} className="px-3 md:px-6 py-4 text-center">
                              <button
                                onClick={() => togglePermission(teacher.id, permission.code)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                  hasPermission(teacher.id, permission.code)
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {hasPermission(teacher.id, permission.code) ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={savePermissions}
          disabled={saving}
          className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
}

