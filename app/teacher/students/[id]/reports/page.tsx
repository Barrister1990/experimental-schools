'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, Download, Calendar, Filter, Printer } from 'lucide-react';
import { Student } from '@/types';
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
  const { showError, showWarning, showInfo } = useAlert();
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [selectedReport, setSelectedReport] = useState<string>('');

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const studentRes = await fetch(`/api/students/${studentId}`, { credentials: 'include' });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }
      } catch (error: any) {
        console.error('Failed to load student:', error);
        showError(error.message || 'Failed to load student. Please try again.');
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
      description: 'Detailed attendance summary and records',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      id: 'conduct',
      name: 'Conduct Report',
      description: 'Student conduct and interest evaluation report',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Report',
      description: 'Complete report including all academic and behavioral data',
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  const handleGenerateReport = () => {
    if (!selectedReport) {
      showWarning('Please select a report type');
      return;
    }
    // In real app, this would generate a PDF report
    showInfo(`Generating ${reportOptions.find((r) => r.id === selectedReport)?.name}...`);
  };

  const handlePrint = () => {
    if (!selectedReport) {
      showWarning('Please select a report type');
      return;
    }
    // In real app, this would print the report
    showInfo(`Printing ${reportOptions.find((r) => r.id === selectedReport)?.name}...`);
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <TikTokLoader text="Fetching reports..." />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-sm md:text-base text-gray-600">The student you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => router.push(`/teacher/students/${studentId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900">Generate Reports</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {student.firstName} {student.lastName} - {student.studentId}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Select Report Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              {getAcademicYearOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="block w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base appearance-none bg-white"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Options */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedReport(option.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedReport === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedReport === option.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    {option.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">{option.description}</p>
                </div>
                {selectedReport === option.id && (
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            disabled={!selectedReport}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={!selectedReport}
            className="px-4 md:px-6 py-2 text-sm md:text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
}

