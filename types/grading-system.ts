/**
 * Universal Grading System Configuration
 * Used throughout the system for consistent grading
 */

export interface GradeLevel {
  id: string;
  code: string; // e.g., "HP", "P", "AP", "D", "E"
  name: string; // e.g., "High Proficient", "Proficient"
  minPercentage: number; // Inclusive
  maxPercentage: number; // Inclusive
  order: number; // For sorting (higher is better)
}

export interface GradingSystem {
  id: string;
  name: string;
  description: string;
  gradeLevels: GradeLevel[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default Grading System
 * HP: 80-100% (High Proficient)
 * P: 68-79% (Proficient)
 * AP: 54-67% (Approaching Proficiency)
 * D: 40-53% (Developing)
 * E: Below 40% (Emerging)
 */
export const DEFAULT_GRADING_SYSTEM: GradingSystem = {
  id: 'default',
  name: 'Universal Grading System',
  description: 'Standard grading system for Hohoe Experimental Schools',
  gradeLevels: [
    {
      id: 'hp',
      code: 'HP',
      name: 'High Proficient',
      minPercentage: 80,
      maxPercentage: 100,
      order: 5,
    },
    {
      id: 'p',
      code: 'P',
      name: 'Proficient',
      minPercentage: 68,
      maxPercentage: 79,
      order: 4,
    },
    {
      id: 'ap',
      code: 'AP',
      name: 'Approaching Proficiency',
      minPercentage: 54,
      maxPercentage: 67,
      order: 3,
    },
    {
      id: 'd',
      code: 'D',
      name: 'Developing',
      minPercentage: 40,
      maxPercentage: 53,
      order: 2,
    },
    {
      id: 'e',
      code: 'E',
      name: 'Emerging',
      minPercentage: 0,
      maxPercentage: 39,
      order: 1,
    },
  ],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Get grade code from percentage using the grading system
 */
export function getGradeFromPercentage(
  percentage: number,
  gradingSystem: GradingSystem = DEFAULT_GRADING_SYSTEM
): string {
  const gradeLevel = gradingSystem.gradeLevels.find(
    (level) => percentage >= level.minPercentage && percentage <= level.maxPercentage
  );
  return gradeLevel?.code || 'E';
}

/**
 * Get grade level details from percentage
 */
export function getGradeLevelFromPercentage(
  percentage: number,
  gradingSystem: GradingSystem = DEFAULT_GRADING_SYSTEM
): GradeLevel | null {
  return (
    gradingSystem.gradeLevels.find(
      (level) => percentage >= level.minPercentage && percentage <= level.maxPercentage
    ) || null
  );
}

