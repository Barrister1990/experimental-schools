'use client';

import TikTokLoader from '@/components/TikTokLoader';
import { Student } from '@/types';
import { ArrowLeft, Calendar, Download, FileText, Filter, Printer } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAlert } from '@/components/shared/AlertProvider';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';

interface ReportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export default function StudentReportsPage() {
  const router = useRouter();
  const { showInfo } = useAlert();
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedReport, setSelectedReport] = useState<string>('');

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const res = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (res.ok) {
          const studentData = await res.json();
          setStudent(studentData);
        }
      } catch (error) {
        console.error('Failed to load student:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadStudent();
    }
  }, [studentId]);

  const reportOptions: ReportOption[] = [
    {
      id: 'academic',
      name: 'Academic Report',
      description: 'Complete academic performance report with grades and assessments',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'attendance',
      name: 'Attendance Report',
      description: 'Detailed attendance summary and statistics',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Report',
      description: 'Complete student report including grades, attendance, and conduct',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'progress',
      name: 'Progress Report',
      description: 'Student progress over time with trends and analysis',
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  const handleGenerateReport = (reportId: string) => {
    // In a real app, this would generate and download a PDF report
    showInfo(`Generating ${reportOptions.find((r) => r.id === reportId)?.name} for Term ${selectedTerm}...`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Student Reports</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {student.firstName} {student.lastName} - {student.studentId}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrintReport}
          className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4" />
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
              <option value="all">All Terms</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4" />
              Academic Year
            </label>
            <select
              defaultValue={getCurrentAcademicYear()}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {reportOptions.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {report.icon}
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {report.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleGenerateReport(report.id)}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        ))}
      </div>

      {/* Report Preview Section */}
      {selectedReport && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Report Preview</h2>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Report preview will appear here after generation
            </p>
          </div>
        </div>
      )}

      {/* Quick Report Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => handleGenerateReport('academic')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-1">Academic Report</h3>
            <p className="text-xs text-gray-600">Generate academic performance report</p>
          </button>
          <button
            onClick={() => handleGenerateReport('attendance')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-1">Attendance Report</h3>
            <p className="text-xs text-gray-600">Generate attendance summary</p>
          </button>
          <button
            onClick={() => handleGenerateReport('comprehensive')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-1">Full Report</h3>
            <p className="text-xs text-gray-600">Generate comprehensive report</p>
          </button>
        </div>
      </div>
    </div>
  );
}

