'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import { getLevelName } from '@/lib/utils/class-levels';
import { Class, Student } from '@/types';
import React from 'react';

interface GradeData {
  subject: string;
  classScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  position: number;
  remark?: string;
}

interface PrintReportCardProps {
  student: Student;
  classInfo: Class | null;
  year: string;
  term: string;
  filteredGrades: GradeData[];
  attendance?: {
    presentDays: number;
    totalDays: number;
  };
  conduct?: string;
  interest?: string;
  classTeacherRemarks?: string;
  classPosition?: number; // Overall position in class ranking
  rollNumber?: number; // Position in class enrollment
  totalStudents?: number; // Total number of students in class
  closingDate?: string; // Term closing date
  reopeningDate?: string; // Next term reopening date
}

const getGradeColor = (grade: string): number => {
  switch (grade) {
    case 'HP':
      return 1; // green
    case 'P':
      return 2; // lightgreen
    case 'AP':
      return 3; // yellow
    case 'D':
      return 4; // orange
    case 'E':
      return 5; // red
    // For Basic 7-9: grades 1-9
    case '1':
      return 1; // green
    case '2':
      return 2; // lightgreen
    case '3':
      return 3; // yellow
    case '4':
    case '5':
    case '6':
      return 4; // orange
    case '7':
    case '8':
      return 4; // orange
    case '9':
      return 5; // red
    default:
      return 0; // grey
  }
};

const getGradeInterpretation = (grade: string): string => {
  switch (grade) {
    case 'HP':
      return 'High Proficient';
    case 'P':
      return 'Proficient';
    case 'AP':
      return 'Approaching Proficiency';
    case 'D':
      return 'Developing';
    case 'E':
      return 'Emerging';
    // For Basic 7-9: grades 1-9
    case '1':
      return 'EXCELLENT';
    case '2':
      return 'VERY GOOD';
    case '3':
      return 'GOOD';
    case '4':
    case '5':
    case '6':
      return 'CREDIT';
    case '7':
    case '8':
      return 'PASS';
    case '9':
      return 'FAIL';
    default:
      return '';
  }
};

// Convert percentage to grade 1-9 for Basic 7-9
const calculateGradeForBasic7to9 = (percentage: number): string => {
  if (percentage >= 80) return '1';
  if (percentage >= 70) return '2';
  if (percentage >= 65) return '3';
  if (percentage >= 60) return '4';
  if (percentage >= 55) return '5';
  if (percentage >= 50) return '6';
  if (percentage >= 45) return '7';
  if (percentage >= 40) return '8';
  return '9';
};

// Calculate aggregate for Basic 7-9
// Aggregate = Sum of 4 mandatory subjects + 2 best additional subjects
// Mandatory: Mathematics, English Language, Science, Social Studies
// If any subject is missing, use grade 9
const calculateAggregateForBasic7to9 = (filteredGrades: GradeData[]): number => {
  // Mandatory subjects (normalized to lowercase for case-insensitive matching)
  const mandatorySubjects = ['mathematics', 'english language', 'science', 'social studies'];
  
  // Normalize subject names to lowercase for matching
  const normalizeSubjectName = (name: string): string => name.toLowerCase().trim();
  
  // Create a map of normalized subject name to grade (as number)
  const gradeMap = new Map<string, number>();
  
  filteredGrades.forEach((grade) => {
    const normalizedName = normalizeSubjectName(grade.subject);
    const numericGrade = parseInt(calculateGradeForBasic7to9(grade.totalScore), 10);
    gradeMap.set(normalizedName, numericGrade);
  });
  
  let aggregate = 0;
  
  // Add mandatory subjects (use grade 9 if missing)
  mandatorySubjects.forEach((subject) => {
    const grade = gradeMap.get(subject);
    aggregate += grade !== undefined ? grade : 9;
  });
  
  // Find best 2 additional subjects (excluding mandatory subjects)
  // Best = lowest grade number (1 is best, 9 is worst)
  const additionalSubjects: Array<{ subject: string; grade: number }> = [];
  
  filteredGrades.forEach((grade) => {
    const normalizedName = normalizeSubjectName(grade.subject);
    if (!mandatorySubjects.includes(normalizedName)) {
      const numericGrade = parseInt(calculateGradeForBasic7to9(grade.totalScore), 10);
      additionalSubjects.push({ subject: grade.subject, grade: numericGrade });
    }
  });
  
  // Sort by grade (ascending - lowest is best)
  additionalSubjects.sort((a, b) => a.grade - b.grade);
  
  // Add best 2 additional subjects (use grade 9 if less than 2 available)
  if (additionalSubjects.length >= 2) {
    aggregate += additionalSubjects[0].grade + additionalSubjects[1].grade;
  } else if (additionalSubjects.length === 1) {
    aggregate += additionalSubjects[0].grade + 9;
  } else {
    aggregate += 9 + 9; // Both missing, use grade 9 for both
  }
  
  return aggregate;
};

// Helper function to format date as "6th December, 2025"
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n: number): string => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
  } catch {
    return '';
  }
};

const PrintReportCard: React.FC<PrintReportCardProps> = ({
  student,
  classInfo,
  year,
  term,
  filteredGrades,
  attendance,
  conduct,
  interest,
  classTeacherRemarks,
  classPosition,
  rollNumber,
  totalStudents,
  closingDate,
  reopeningDate,
}) => {
  const { showWarning } = useAlert();
  
  const handlePrint = () => {
    // Legal page size: 8.5" x 14" (216mm x 356mm)
    const printWindow = window.open('', '', 'height=1000,width=800');

    if (!printWindow) {
      showWarning('Please allow pop-ups to generate the report card.');
      return;
    }

    const classLevel = classInfo ? getLevelName(classInfo.level) : 'Unknown';
    const studentName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim();
    const logoPath = window.location.origin + '/logo.png';
    const headmasterSignaturePath = window.location.origin + '/headmasterSign.png';
    
    // Get attendance data
    const presentDays = attendance?.presentDays || 0;
    const totalDays = attendance?.totalDays || 0;
    const attendanceDisplay = totalDays > 0 ? `${presentDays} out of ${totalDays}` : '.................';
    
    // Format dates
    const formattedClosingDate = formatDate(closingDate);
    const formattedReopeningDate = formatDate(reopeningDate);

    let content = '';

    // Determine template based on class level
    if (classLevel === 'KG 1' || classLevel === 'KG 2') {
      content = `
        <html>
        <head>
          <title>Report Card</title>
          <style>
            @page { size: legal; margin: 0.5in; }
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12pt; }
            .container { max-width: 100%; margin: 0 auto; }
            .title { text-align: center; margin: 1px auto; font-size: 12pt; }
            .student-info { width: 100%; font-size: 12pt; }
            .student-box { display: inline-flex; justify-content: space-between; width: 100%; margin: 0 auto; }
            .table-container { border-collapse: collapse; width: 100%; font-size: 12pt; }
            .table-container th, .table-container td { border: 1px solid black; padding: 8px; font-size: 12pt; }
            .table-container th { background-color: #f4f4f4; font-size: 12pt; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            .header-row th { border: 1px solid black; padding: 8px; background-color: #f2f2f2; font-weight: bold; font-size: 12pt; }
            .data-row td { border: 1px solid black; padding: 8px; text-align: center; font-size: 12pt; }
            .header-grade { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            .header-interp { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            img { height: 100px; width: 100px; margin-left: 43%; }
          </style>
        </head>
        <body>
          <div class="container">
            <h4 class="title">HOHOE E.P BASIC 'A' SCHOOL</h4>
            <p class="title">P.O.BOX 2, HOHOE MUNICIPAL</p>
            <h5 class="title">TERMINAL REPORT</h5>
            <h5 class="title">KINDERGARTEN</h5>
            <img src="${logoPath}" alt="logo" />
            <div class="student-info">
              <div class="student-box">
                <p><strong>NAME:</strong> ${studentName}</p>
                <p><strong>CLASS/STAGE:</strong> ${classLevel}</p>
              </div>
              <div class="student-box">
                <p><strong>TERM:</strong> ${term}</p>
                <p><strong>ACADEMIC YEAR:</strong> ${year}</p>
                <p><strong>NO. ON ROLL:</strong> ${rollNumber && totalStudents ? `${rollNumber} of ${totalStudents}` : '...................'}</p>
              </div>
              <div class="student-box">
                <p><strong>POSITION:</strong> ${classPosition ? classPosition : '...............'}</p>
                <p><strong>CLOSING DATE:</strong> ${formattedClosingDate || '...............'}</p>
                <p><strong>NEXT TERM BEGINS:</strong> ${formattedReopeningDate || '..............'}</p>
              </div>
            </div>
            <table class="table-container">
              <thead>
                <tr>
                  <th>SUBJECTS</th>
                  <th>CLASS SCORE 50%</th>
                  <th>EXAMS SCORE 50%</th>
                  <th>TOTAL SCORE 100%</th>
                  <th>GRADE</th>
                  <th>POSITION</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGrades
                  .map(
                    (grade) => `
                  <tr>
                    <td>${grade.subject}</td>
                    <td>${grade.classScore.toFixed(1)}</td>
                    <td>${grade.examScore.toFixed(1)}</td>
                    <td>${grade.totalScore.toFixed(1)}</td>
                    <td>${grade.grade}</td>
                    <td>${grade.position}</td>
                    <td>${getGradeInterpretation(grade.grade)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="remarks">
              <div class="student-box">
                <p><strong>ATTENDANCE:</strong> ${attendanceDisplay}</p>
                <p><strong>OUT OF:</strong> ${totalDays > 0 ? totalDays : '...............'}</p>
                <p><strong>PROMOTED TO:</strong>...............</p>
              </div>
              <p><strong>CONDUCT:</strong> ${conduct || '.........................'}</p>
              <p><strong>INTEREST:</strong> ${interest || '.........................................'}</p>
              <p><strong>CLASS TEACHER'S REMARKS:</strong> ${classTeacherRemarks || '........................................'}</p>
            </div>
            <div class="signatures" style="position: relative; display: inline-block; width: 100%;">
              <p style="display: inline-block; margin: 0; margin-right: 0; font-size: 12pt; font-weight: bold;"><strong>HEADMASTER'S SIGNATURE:</strong></p>
              <img src="${headmasterSignaturePath}" alt="Headmaster Signature" style="position: relative; display: inline-block; max-width: 200px; height: auto; vertical-align: middle; margin-left: 5px;" />
            </div>
             <table>
    <thead>
      <tr class="header-row">
      <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
        <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
      </tr>
    </thead>
    <tbody>
      <tr class="data-row">
        <td>80% - 100%</td>
        <td>HP</td>
        <td>High Proficient</td>
        <td>40% - 53%</td>
        <td>D</td>
        <td>Developing</td>
      </tr>
      <tr class="data-row">
        <td>68% - 79%</td>
        <td>P</td>
        <td>Proficient</td>
        <td>39% - below</td>
        <td>E</td>
        <td>Emerging</td>
      </tr>
      <tr class="data-row">
        <td>54% - 67%</td>
        <td>AP</td>
        <td>Approaching Proficiency</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
          </div>
        </body>
        </html>
      `;
    } else if (classLevel === 'Basic 1' || classLevel === 'Basic 2' || classLevel === 'Basic 3') {
      content = `
        <html>
        <head>
          <title>Report Card</title>
          <style>
            @page { size: legal; margin: 0.5in; }
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12pt; }
            .container { max-width: 100%; margin: 0 auto; }
            .title { text-align: center; margin: 1px auto; font-size: 12pt; }
            .student-info { width: 100%; font-size: 12pt; }
            .student-box { display: inline-flex; justify-content: space-between; width: 100%; margin: 0 auto; }
            .table-container { border-collapse: collapse; width: 100%; font-size: 12pt; }
            .table-container th, .table-container td { border: 1px solid black; padding: 8px; font-size: 12pt; }
            .table-container th { background-color: #f4f4f4; font-size: 12pt; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            .header-row th { border: 1px solid black; padding: 8px; background-color: #f2f2f2; font-weight: bold; font-size: 12pt; }
            .data-row td { border: 1px solid black; padding: 8px; text-align: center; font-size: 12pt; }
            .header-grade { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            .header-interp { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            img { height: 100px; width: 100px; margin-left: 43%; }
          </style>
        </head>
        <body>
          <div class="container">
            <h4 class="title">HOHOE E.P BASIC 'A' SCHOOL</h4>
            <p class="title">P.O.BOX 2, HOHOE MUNICIPAL</p>
            <h5 class="title">TERMINAL REPORT</h5>
            <h5 class="title">LOWER PRIMARY</h5>
            <img src="${logoPath}" alt="logo" />
            <div class="student-info">
              <div class="student-box">
                <p><strong>NAME:</strong> ${studentName}</p>
                <p><strong>CLASS/STAGE:</strong> ${classLevel}</p>
              </div>
              <div class="student-box">
                <p><strong>TERM:</strong> ${term}</p>
                <p><strong>ACADEMIC YEAR:</strong> ${year}</p>
                <p><strong>NO. ON ROLL:</strong> ${rollNumber && totalStudents ? `${rollNumber} of ${totalStudents}` : '...................'}</p>
              </div>
              <div class="student-box">
                <p><strong>POSITION:</strong> ${classPosition ? classPosition : '...............'}</p>
                <p><strong>CLOSING DATE:</strong> ${formattedClosingDate || '...............'}</p>
                <p><strong>NEXT TERM BEGINS:</strong> ${formattedReopeningDate || '..............'}</p>
              </div>
            </div>
            <table class="table-container">
              <thead>
                <tr>
                  <th>SUBJECTS</th>
                  <th>CLASS SCORE 50%</th>
                  <th>EXAMS SCORE 50%</th>
                  <th>TOTAL SCORE 100%</th>
                  <th>GRADE</th>
                  <th>POSITION</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGrades
                  .map(
                    (grade) => `
                  <tr>
                    <td>${grade.subject}</td>
                    <td>${grade.classScore.toFixed(1)}</td>
                    <td>${grade.examScore.toFixed(1)}</td>
                    <td>${grade.totalScore.toFixed(1)}</td>
                    <td>${grade.grade}</td>
                    <td>${grade.position}</td>
                    <td>${getGradeInterpretation(grade.grade)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="remarks">
              <div class="student-box">
                <p><strong>ATTENDANCE:</strong> ${attendanceDisplay}</p>
                <p><strong>OUT OF:</strong> ${totalDays > 0 ? totalDays : '...............'}</p>
                <p><strong>PROMOTED TO:</strong>...............</p>
              </div>
              <p><strong>CONDUCT:</strong> ${conduct || '...............................................'}</p>
              <p><strong>INTEREST:</strong> ${interest || '.........................................'}</p>
              <p><strong>CLASS TEACHER'S REMARKS:</strong> ${classTeacherRemarks || '........................................'}</p>
            </div>
                        <div class="signatures" style="position: relative; display: inline-block; width: 100%;">
              <p style="display: inline-block; margin: 0; margin-right: 0; font-size: 12pt; font-weight: bold;"><strong>HEADMASTER'S SIGNATURE:</strong></p>
              <img src="${headmasterSignaturePath}" alt="Headmaster Signature" style="position: relative; display: inline-block; max-width: 200px; height: auto; vertical-align: middle; margin-left: 5px;" />
            </div>
             <table>
    <thead>
      <tr class="header-row">
      <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
        <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
      </tr>
    </thead>
    <tbody>
      <tr class="data-row">
        <td>80% - 100%</td>
        <td>HP</td>
        <td>High Proficient</td>
        <td>40% - 53%</td>
        <td>D</td>
        <td>Developing</td>
      </tr>
      <tr class="data-row">
        <td>68% - 79%</td>
        <td>P</td>
        <td>Proficient</td>
        <td>39% - below</td>
        <td>E</td>
        <td>Emerging</td>
      </tr>
      <tr class="data-row">
        <td>54% - 67%</td>
        <td>AP</td>
        <td>Approaching Proficiency</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
          </div>
        </body>
        </html>
      `;
    } else if (classLevel === 'Basic 4' || classLevel === 'Basic 5' || classLevel === 'Basic 6') {
      content = `
        <html>
        <head>
          <title>Report Card</title>
          <style>
            @page { size: legal; margin: 0.5in; }
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12pt; }
            .container { max-width: 100%; margin: 0 auto; }
            .title { text-align: center; margin: 1px auto; font-size: 12pt; }
            .student-info { width: 100%; font-size: 12pt; }
            .student-box { display: inline-flex; justify-content: space-between; width: 100%; margin: 0 auto; }
            .table-container { border-collapse: collapse; width: 100%; font-size: 12pt; }
            .table-container th, .table-container td { border: 1px solid black; padding: 8px; font-size: 12pt; }
            .table-container th { background-color: #f4f4f4; font-size: 12pt; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            .header-row th { border: 1px solid black; padding: 8px; background-color: #f2f2f2; font-weight: bold; font-size: 12pt; }
            .data-row td { border: 1px solid black; padding: 8px; text-align: center; font-size: 12pt; }
            .header-grade { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            .header-interp { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            img { height: 100px; width: 100px; margin-left: 43%; }
          </style>
        </head>
        <body>
          <div class="container">
            <h4 class="title">HOHOE E.P BASIC 'A' SCHOOL</h4>
            <p class="title">P.O.BOX 2, HOHOE MUNICIPAL</p>
            <h5 class="title">TERMINAL REPORT</h5>
            <h5 class="title">UPPER PRIMARY</h5>
            <img src="${logoPath}" alt="logo" />
            <div class="student-info">
              <div class="student-box">
                <p><strong>NAME:</strong> ${studentName}</p>
                <p><strong>CLASS/STAGE:</strong> ${classLevel}</p>
              </div>
              <div class="student-box">
                <p><strong>TERM:</strong> ${term}</p>
                <p><strong>ACADEMIC YEAR:</strong> ${year}</p>
                <p><strong>NO. ON ROLL:</strong> ${rollNumber && totalStudents ? `${rollNumber} of ${totalStudents}` : '...................'}</p>
              </div>
              <div class="student-box">
                <p><strong>POSITION:</strong> ${classPosition ? classPosition : '...............'}</p>
                <p><strong>CLOSING DATE:</strong> ${formattedClosingDate || '...............'}</p>
                <p><strong>NEXT TERM BEGINS:</strong> ${formattedReopeningDate || '..............'}</p>
              </div>
            </div>
            <table class="table-container">
              <thead>
                <tr>
                  <th>SUBJECTS</th>
                  <th>CLASS SCORE 50%</th>
                  <th>EXAMS SCORE 50%</th>
                  <th>TOTAL SCORE 100%</th>
                  <th>GRADE</th>
                  <th>POSITION</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGrades
                  .map(
                    (grade) => `
                  <tr>
                    <td>${grade.subject}</td>
                    <td>${grade.classScore.toFixed(1)}</td>
                    <td>${grade.examScore.toFixed(1)}</td>
                    <td>${grade.totalScore.toFixed(1)}</td>
                    <td>${grade.grade}</td>
                    <td>${grade.position}</td>
                    <td>${getGradeInterpretation(grade.grade)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="remarks">
              <div class="student-box">
                <p><strong>ATTENDANCE:</strong> ${attendanceDisplay}</p>
                <p><strong>OUT OF:</strong> ${totalDays > 0 ? totalDays : '...............'}</p>
                <p><strong>PROMOTED TO:</strong>...............</p>
              </div>
              <p><strong>CONDUCT:</strong> ${conduct || '...............................................'}</p>
              <p><strong>INTEREST:</strong> ${interest || '.........................................'}</p>
              <p><strong>CLASS TEACHER'S REMARKS:</strong> ${classTeacherRemarks || '........................................'}</p>
            </div>
                        <div class="signatures" style="position: relative; display: inline-block; width: 100%;">
              <p style="display: inline-block; margin: 0; margin-right: 0; font-size: 12pt; font-weight: bold;"><strong>HEADMASTER'S SIGNATURE:</strong></p>
              <img src="${headmasterSignaturePath}" alt="Headmaster Signature" style="position: relative; display: inline-block; max-width: 200px; height: auto; vertical-align: middle; margin-left: 5px;" />
            </div>
             <table>
    <thead>
      <tr class="header-row">
      <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
        <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-interp">INTER.</th>
      </tr>
    </thead>
    <tbody>
      <tr class="data-row">
        <td>80% - 100%</td>
        <td>HP</td>
        <td>High Proficient</td>
        <td>40% - 53%</td>
        <td>D</td>
        <td>Developing</td>
      </tr>
      <tr class="data-row">
        <td>68% - 79%</td>
        <td>P</td>
        <td>Proficient</td>
        <td>39% - below</td>
        <td>E</td>
        <td>Emerging</td>
      </tr>
      <tr class="data-row">
        <td>54% - 67%</td>
        <td>AP</td>
        <td>Approaching Proficiency</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
          </div>
        </body>
        </html>
      `;
    } else if (classLevel === 'Basic 7' || classLevel === 'Basic 8' || classLevel === 'Basic 9') {
      // Calculate aggregate for Basic 7-9
      const aggregate = calculateAggregateForBasic7to9(filteredGrades);
      
      content = `
        <html>
        <head>
          <title>Report Card</title>
          <style>
            @page { size: legal; margin: 0.5in; }
            body { font-family: Arial, sans-serif; margin: 15px; font-size: 12pt; }
            .container { max-width: 100%; margin: 0 auto; }
            .title { text-align: center; margin: 0 auto; font-size: 12pt; }
            .student-info { width: 100%; font-size: 12pt; }
            .student-box { display: inline-flex; justify-content: space-between; width: 100%; margin: 0 auto; }
            .table-container { border-collapse: collapse; width: 100%; font-size: 12pt; }
            .table-container th, .table-container td { border: 1px solid black; padding: 8px; font-size: 12pt; }
            .table-container th { background-color: #f4f4f4; font-size: 12pt; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            .header-row th { border: 1px solid black; padding: 8px; background-color: #f2f2f2; font-weight: bold; font-size: 12pt; }
            .data-row td { border: 1px solid black; padding: 8px; text-align: center; font-size: 12pt; }
            .header-grade { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            .header-interp { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            .header-inter { border-top: none; border-bottom: 2px solid black; text-align: center; font-size: 12pt; }
            img { height: 100px; width: 100px; margin-left: 43%; }
          </style>
        </head>
        <body>
          <div class="container">
            <h5 class="title">HOHOE E.P BASIC 'A' SCHOOL</h5>
            <p class="title">P.O.BOX 2, HOHOE MUNICIPAL</p>
            <h6 class="title">TERMINAL REPORT</h6>
            <h6 class="title">JUNIOR HIGH SCHOOL</h6>
            <img src="${logoPath}" alt="logo" />
            <div class="student-info">
              <div class="student-box">
                <p><strong>NAME:</strong> ${studentName}</p>
                <p><strong>FORM:</strong> ${classLevel}</p>
              </div>
              <div class="student-box">
                <p><strong>TERM:</strong> ${term}</p>
                <p><strong>ACADEMIC YEAR:</strong> ${year}</p>
                <p><strong>NO. ON ROLL:</strong> ${rollNumber && totalStudents ? `${rollNumber} of ${totalStudents}` : '.....................'}</p>
              </div>
              <div class="student-box">
                <p><strong>AGGREGATE:</strong> ${aggregate}</p>
                <p><strong>CLOSING DATE:</strong> ${formattedClosingDate || '...........................'}</p>
                <p><strong>NEXT TERM BEGINS:</strong> ${formattedReopeningDate || '....................'}</p>
              </div>
            </div>
            <table class="table-container">
              <thead>
                <tr>
                  <th>SUBJECTS</th>
                  <th>CLASS SCORE 50%</th>
                  <th>EXAMS SCORE 50%</th>
                  <th>TOTAL SCORE 100%</th>
                  <th>GRADE</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${filteredGrades
                  .map(
                    (grade) => {
                      // Convert to grade 1-9 for Basic 7-9
                      const numericGrade = calculateGradeForBasic7to9(grade.totalScore);
                      return `
                  <tr>
                    <td>${grade.subject}</td>
                    <td>${grade.classScore.toFixed(1)}</td>
                    <td>${grade.examScore.toFixed(1)}</td>
                    <td>${grade.totalScore.toFixed(1)}</td>
                    <td>${numericGrade}</td>
                    <td>${getGradeInterpretation(numericGrade)}</td>
                  </tr>
                `;
                    }
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="remarks">
              <div class="student-box">
                <p><strong>ATTENDANCE:</strong> ${attendanceDisplay}</p>
                <p><strong>OUT OF:</strong> ${totalDays > 0 ? totalDays : '...............'}</p>
                <p><strong>PROMOTED TO:</strong>...............</p>
              </div>
              <p><strong>CONDUCT:</strong> ${conduct || '...............................................'}</p>
              <p><strong>INTEREST:</strong> ${interest || '.........................................'}</p>
              <p><strong>CLASS TEACHER'S REMARKS:</strong> ${classTeacherRemarks || '........................................'}</p>
            </div>
                        <div class="signatures" style="position: relative; display: inline-block; width: 100%;">
              <p style="display: inline-block; margin: 0; margin-right: 0; font-size: 12pt; font-weight: bold;"><strong>HEADMASTER'S SIGNATURE:</strong></p>
              <img src="${headmasterSignaturePath}" alt="Headmaster Signature" style="position: relative; display: inline-block; max-width: 200px; height: auto; vertical-align: middle; margin-left: 5px;" />
            </div>
            <table>
    <thead>
      <tr class="header-row">
      <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-inter">INTER.</th>
        <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-inter">INTER.</th>
         <th class="header-grade">MARKS</th>
        <th class="header-grade">GRADES</th>
        <th class="header-inter">INTER.</th>
      </tr>
    </thead>
    <tbody>
      <tr class="data-row">
        <td>80% - 100%</td>
        <td>1</td>
        <td>EXCELLENT</td>
        <td>60% - 64%</td>
        <td>4</td>
        <td>CREDIT</td>
         <td>45% - 49%</td>
        <td>7</td>
        <td>PASS</td>
      </tr>
      <tr class="data-row">
        <td>70% - 79%</td>
        <td>2</td>
        <td>VERY GOOD</td>
        <td>55% - 59%</td>
        <td>5</td>
        <td>CREDIT</td>
         <td>40% - 44%</td>
        <td>8</td>
        <td>PASS</td>
      </tr>
      <tr class="data-row">
        <td>65% - 69%</td>
        <td>3</td>
        <td>GOOD</td>
        <td>50% - 54%</td>
        <td>6</td>
        <td>CREDIT</td>
         <td>0% - 39%</td>
        <td>9</td>
        <td>FAIL</td>
      </tr>
    </tbody>
  </table>
          </div>
        </body>
        </html>
      `;
    }

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  return (
    <button
      onClick={handlePrint}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
    >
      Generate Report Card
    </button>
  );
};

export default PrintReportCard;

