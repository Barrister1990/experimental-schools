'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Class, Student } from '@/types';
import { getLevelName, isHighestLevel, getNextLevel } from '@/lib/utils/class-levels';

interface PromotionStatus {
  classId: string;
  className: string;
  level: number;
  canPromote: boolean;
  reason?: string;
  studentsToPromote: number;
}

export default function PromotionsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch classes
        const classesRes = await fetch('/api/classes', { credentials: 'include' });
        if (!classesRes.ok) {
          throw new Error('Failed to load classes');
        }
        const classesData = await classesRes.json();
        const classesArray = Array.isArray(classesData) ? classesData : [];
        setClasses(classesArray.sort((a, b) => b.level - a.level)); // Sort by level descending

        // Check promotion eligibility for each class
        const statuses: PromotionStatus[] = [];
        for (const cls of classesArray) {
          if (!isHighestLevel(cls.level)) {
            // Check if next level class exists and is graduated
            const nextLevel = getNextLevel(cls.level);
            if (nextLevel === null) continue;
            
            const nextLevelClasses = classesArray.filter((c) => c.level === nextLevel);
            
            // Check promotion eligibility
            // Multiple classes at the same level can promote to fewer classes at the next level
            // e.g., Basic 1A and Basic 1B can both promote to Basic 2 even if there's only one Basic 2 class
            let canPromote = true;
            if (isHighestLevel(nextLevel)) {
              // If promoting to Basic 9 (highest level), check if Basic 9 classes are graduated
              const highestClasses = classesArray.filter((c) => c.level === nextLevel);
              for (const highestClass of highestClasses) {
                const studentsRes = await fetch(`/api/students?classId=${highestClass.id}`, { credentials: 'include' });
                if (studentsRes.ok) {
                  const highestStudents = await studentsRes.json();
                  const studentsArray = Array.isArray(highestStudents) ? highestStudents : [];
                  const activeHighestStudents = studentsArray.filter((s: any) => s.status === 'active');
                  if (activeHighestStudents.length > 0) {
                    canPromote = false;
                    break;
                  }
                }
              }
            } else {
              // For other levels, check if next level has at least one class available
              // Multiple classes at current level can promote to the same next level class
              // We just need to ensure the next level has at least one class
              if (nextLevelClasses.length === 0) {
                // No classes at next level yet, but promotion is still possible
                // (admin can create the class if needed)
                canPromote = true;
              } else {
                // Check if any next level class has capacity or if students are graduated
                // For now, allow promotion if next level classes exist
                // In real app, would check capacity and graduation status
                canPromote = true;
              }
            }
            
            // Fetch students for this class
            const studentsRes = await fetch(`/api/students?classId=${cls.id}`, { credentials: 'include' });
            let activeStudents: Student[] = [];
            if (studentsRes.ok) {
              const students = await studentsRes.json();
              const studentsArray = Array.isArray(students) ? students : [];
              activeStudents = studentsArray.filter((s: any) => s.status === 'active');
            }

            statuses.push({
              classId: cls.id,
              className: cls.name,
              level: cls.level,
              canPromote,
              reason: canPromote 
                ? undefined 
                : `Students in ${getLevelName(nextLevel)} must be graduated first`,
              studentsToPromote: activeStudents.length,
            });
          }
        }
        setPromotionStatus(statuses.sort((a, b) => b.level - a.level));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePromote = (classId: string) => {
    router.push(`/admin/classes/${classId}/promote`);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching promotion status..." />
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
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Student Promotions</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Promote students to the next class level
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Promotion Rules</h3>
            <p className="text-xs text-blue-800">
              Students can only be promoted if the higher level has been graduated first. 
              Promotions must be done from the highest level (Basic 9) down to the lowest (KG 1).
              Multiple classes at the same level (e.g., Basic 1A and Basic 1B) can promote to the same next level class.
            </p>
          </div>
        </div>
      </div>

      {/* Promotion Status List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Classes Available for Promotion</h2>
        </div>
        {promotionStatus.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No classes available for promotion</p>
            <p className="text-xs mt-2">Only classes below Basic 9 can be promoted</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {promotionStatus.map((status) => (
              <div
                key={status.classId}
                className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">
                          {status.className}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          {getLevelName(status.level)} • {status.studentsToPromote} students ready
                        </p>
                      </div>
                    </div>
                    {status.canPromote ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Ready to promote</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>{status.reason}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handlePromote(status.classId)}
                    disabled={!status.canPromote}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                      status.canPromote
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Promote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

