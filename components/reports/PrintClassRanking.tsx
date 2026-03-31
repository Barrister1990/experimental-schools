'use client';

import { useAlert } from '@/components/shared/AlertProvider';
import { getLevelName } from '@/lib/utils/class-levels';
import { Class, User } from '@/types';
import React from 'react';

interface SubjectScore {
  subjectId: string;
  subjectName: string;
  total: number;
}

interface StudentRanking {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  subjectScores: SubjectScore[];
  overallTotal: number;
  position: number;
}

interface PrintClassRankingProps {
  classInfo: Class;
  classTeacher: User | null;
  year: string;
  term: string;
  rankings: StudentRanking[];
  subjects: Array<{ id: string; name: string }>;
}

const PrintClassRanking: React.FC<PrintClassRankingProps> = ({
  classInfo,
  classTeacher,
  year,
  term,
  rankings,
  subjects,
}) => {
  const { showWarning } = useAlert();
  
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');

    if (!printWindow) {
      showWarning('Please allow pop-ups to generate the class ranking report.');
      return;
    }

    const className = classInfo.name;
    const classLevel = getLevelName(classInfo.level);
    const teacherName = classTeacher?.name || 'Not Assigned';
    const logoPath = window.location.origin + '/logo.png';

    // Shorten subject names if needed (for up to 12 subjects in landscape)
    const shortenSubjectName = (name: string): string => {
      const subjectCount = subjects.length;
      if (subjectCount <= 6) {
        return name; // No shortening needed
      } else if (subjectCount <= 8) {
        // Shorten to max 15 characters
        return name.length > 15 ? name.substring(0, 13) + '..' : name;
      } else if (subjectCount <= 10) {
        // Shorten to max 12 characters
        return name.length > 12 ? name.substring(0, 10) + '..' : name;
      } else {
        // Shorten to max 10 characters for 11-12 subjects
        return name.length > 10 ? name.substring(0, 8) + '..' : name;
      }
    };

    const shortenedSubjects = subjects.map((s) => ({
      ...s,
      shortName: shortenSubjectName(s.name),
    }));

    // Build table rows for students
    const tableRows = rankings.map((ranking) => {
      const subjectCells = shortenedSubjects.map((subject) => {
        const score = ranking.subjectScores.find((s) => s.subjectId === subject.id);
        return `<td class="text-center subject-col">${score ? score.total.toFixed(1) : '-'}</td>`;
      }).join('');

      return `
        <tr>
          <td class="text-center position-col">${ranking.position}</td>
          <td class="text-left name-col">${ranking.studentName}</td>
          ${subjectCells}
          <td class="text-center total-col">${ranking.overallTotal.toFixed(1)}</td>
        </tr>
      `;
    }).join('');

    // Build subject header cells
    const subjectHeaders = shortenedSubjects.map((subject) => {
      const title = subjects.length > 6 ? subject.shortName : subject.name;
      return `<th class="text-center border px-2 py-2 subject-col">${title}</th>`;
    }).join('');

    const content = `
      <html>
      <head>
        <title>Class Ranking Report</title>
        <style>
          @page { 
            size: landscape; 
            margin: 0.25in; 
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 8px; 
            font-size: 9pt; 
          }
          .container { 
            width: 100%; 
            margin: 0 auto; 
          }
          .header { 
            text-align: center; 
            margin-bottom: 10px; 
          }
          .school-name { 
            font-size: 13pt; 
            font-weight: bold; 
            margin-bottom: 3px; 
          }
          .school-address { 
            font-size: 8pt; 
            margin-bottom: 8px; 
          }
          .report-title { 
            font-size: 11pt; 
            font-weight: bold; 
            margin: 8px 0; 
          }
          .class-info { 
            display: flex; 
            justify-content: space-between; 
            flex-wrap: wrap; 
            margin-bottom: 10px; 
            font-size: 9pt; 
            padding: 5px 0; 
            border-bottom: 1px solid #ccc; 
          }
          .class-info-item { 
            margin: 0 8px; 
          }
          img { 
            height: 70px; 
            width: 70px; 
            margin: 0 auto 8px; 
            display: block; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 8pt; 
            margin-top: 8px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 3px 4px; 
            text-align: left; 
          }
          th { 
            background-color: #f4f4f4; 
            font-weight: bold; 
            text-align: center; 
            font-size: 8pt; 
          }
          td { 
            font-size: 8pt; 
          }
          .position-col { 
            width: 35px; 
            text-align: center; 
          }
          .name-col { 
            width: 140px; 
            min-width: 140px; 
            max-width: 140px; 
          }
          .total-col { 
            background-color: #e3f2fd; 
            font-weight: bold; 
            width: 50px; 
          }
          .subject-col { 
            min-width: 50px; 
            max-width: 70px; 
            text-align: center; 
          }
          tbody tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          tbody tr:hover { 
            background-color: #f0f0f0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoPath}" alt="School Logo" />
            <div class="school-name">HOHOE EXPERIMENTAL SCHOOLS</div>
            <div class="school-address">P.O.BOX 313, HOHOE MUNICIPAL</div>
            <div class="report-title">CLASS RANKING REPORT</div>
          </div>

          <div class="class-info">
            <div class="class-info-item"><strong>Class:</strong> ${className} (${classLevel})</div>
            <div class="class-info-item"><strong>Class Teacher:</strong> ${teacherName}</div>
            <div class="class-info-item"><strong>Term:</strong> ${term}</div>
            <div class="class-info-item"><strong>Academic Year:</strong> ${year}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="position-col">Pos</th>
                <th class="name-col">Student Name</th>
                ${subjectHeaders}
                <th class="total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 15px; font-size: 8pt; text-align: right; padding-top: 10px; border-top: 1px solid #ccc;">
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Generate Report PDF
    </button>
  );
};

export default PrintClassRanking;

