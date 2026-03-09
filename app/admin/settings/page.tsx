'use client';

import { useState, useEffect } from 'react';
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/lib/utils/academic-years';
import {
  Settings,
  School,
  Calendar,
  BookOpen,
  User,
  Bell,
  Database,
  Save,
  Edit,
  Check,
  X,
  Award
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAlert } from '@/components/shared/AlertProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showError, showSuccess, showWarning, showInfo } = useAlert();
  const [activeTab, setActiveTab] = useState<string>('school');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // School Information State
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'HOHOE EXPERIMENTAL SCHOOLS',
    address: 'Hohoe, Volta Region, Ghana',
    phone: '+233 XX XXX XXXX',
    email: 'info@hohoebasica.edu.gh',
    website: 'www.hohoebasica.edu.gh',
  });

  // Academic Settings State
  const [academicSettings, setAcademicSettings] = useState({
    currentAcademicYear: getCurrentAcademicYear(),
    currentTerm: '1',
    terms: ['Term 1', 'Term 2', 'Term 3'],
  });

  // Term Settings State
  const [termSettings, setTermSettings] = useState<Array<{
    term: number;
    closingDate: string;
    reopeningDate: string;
  }>>([
    { term: 1, closingDate: '', reopeningDate: '' },
    { term: 2, closingDate: '', reopeningDate: '' },
    { term: 3, closingDate: '', reopeningDate: '' },
  ]);

  // Assessment Structure State
  const [assessmentStructure, setAssessmentStructure] = useState({
    project: 40,
    test1: 20,
    test2: 20,
    groupWork: 20,
    exam: 100,
  });

  // User Account State
  const [userAccount, setUserAccount] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification Settings State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    gradeAlerts: true,
    attendanceAlerts: true,
    reportAlerts: true,
    systemUpdates: false,
  });

  // System Preferences State
  const [systemPrefs, setSystemPrefs] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '5',
    theme: 'light',
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load school settings
        const schoolRes = await fetch('/api/settings/school', { credentials: 'include' });
        if (schoolRes.ok) {
          const schoolData = await schoolRes.json();
          if (schoolData) {
            setSchoolInfo({
              name: schoolData.name || '',
              address: schoolData.address || '',
              phone: schoolData.phone || '',
              email: schoolData.email || '',
              website: schoolData.website || '',
            });
          }
        }

        // Load academic settings
        const academicRes = await fetch('/api/settings/academic', { credentials: 'include' });
        if (academicRes.ok) {
          const academicData = await academicRes.json();
          if (academicData) {
            const currentYear = academicData.currentAcademicYear || getCurrentAcademicYear();
            setAcademicSettings({
              currentAcademicYear: currentYear,
              currentTerm: String(academicData.currentTerm || 1),
              terms: ['Term 1', 'Term 2', 'Term 3'],
            });

            // Load term settings for current academic year
            const termSettingsRes = await fetch(`/api/settings/term?academicYear=${encodeURIComponent(currentYear)}`, { credentials: 'include' });
            if (termSettingsRes.ok) {
              const termSettingsData = await termSettingsRes.json();
              if (Array.isArray(termSettingsData) && termSettingsData.length > 0) {
                const updatedTermSettings = termSettings.map((ts) => {
                  const found = termSettingsData.find((t: any) => t.term === ts.term);
                  return found
                    ? {
                        term: ts.term,
                        closingDate: found.closingDate ? new Date(found.closingDate).toISOString().split('T')[0] : '',
                        reopeningDate: found.reopeningDate ? new Date(found.reopeningDate).toISOString().split('T')[0] : '',
                      }
                    : ts;
                });
                setTermSettings(updatedTermSettings);
              }
            }
          }
        }

        // Load assessment structure
        const assessmentRes = await fetch('/api/settings/assessment', { credentials: 'include' });
        if (assessmentRes.ok) {
          const assessmentData = await assessmentRes.json();
          if (assessmentData) {
            setAssessmentStructure({
              project: assessmentData.project || 40,
              test1: assessmentData.test1 || 20,
              test2: assessmentData.test2 || 20,
              groupWork: assessmentData.groupWork || 20,
              exam: assessmentData.exam || 100,
            });
          }
        }

        // Load user preferences
        const prefsRes = await fetch('/api/settings/preferences', { credentials: 'include' });
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          if (prefsData) {
            setNotifications({
              emailNotifications: prefsData.emailNotifications ?? true,
              gradeAlerts: prefsData.gradeAlerts ?? true,
              attendanceAlerts: prefsData.attendanceAlerts ?? true,
              reportAlerts: prefsData.reportAlerts ?? true,
              systemUpdates: prefsData.systemUpdates ?? false,
            });
            if (prefsData.theme) {
              setSystemPrefs(prev => ({ ...prev, theme: prefsData.theme }));
            }
          }
        }

        // Load system preferences
        const systemRes = await fetch('/api/settings/system', { credentials: 'include' });
        if (systemRes.ok) {
          const systemData = await systemRes.json();
          if (systemData) {
            setSystemPrefs({
              autoBackup: systemData.autoBackup ?? true,
              backupFrequency: systemData.backupFrequency || 'daily',
              dataRetention: String(systemData.dataRetentionYears || 5),
              theme: systemPrefs.theme, // Keep theme from user preferences
            });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      let res;
      switch (section) {
        case 'School Information':
          res = await fetch('/api/settings/school', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(schoolInfo),
          });
          break;
        case 'Academic Settings':
          res = await fetch('/api/settings/academic', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              currentAcademicYear: academicSettings.currentAcademicYear,
              currentTerm: parseInt(academicSettings.currentTerm),
            }),
          });
          break;
        case 'Assessment Structure':
          res = await fetch('/api/settings/assessment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(assessmentStructure),
          });
          break;
        case 'Account':
          // Handle account update (name, phone) - password change handled separately
          if (userAccount.newPassword && userAccount.newPassword !== userAccount.confirmPassword) {
            showWarning('New passwords do not match');
            setSaving(false);
            return;
          }
          // TODO: Implement account update API
          showInfo('Account update feature coming soon');
          setSaving(false);
          return;
        case 'Notifications':
          res = await fetch('/api/settings/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ...notifications,
              theme: systemPrefs.theme,
            }),
          });
          break;
        case 'System Preferences':
          res = await fetch('/api/settings/system', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              autoBackup: systemPrefs.autoBackup,
              backupFrequency: systemPrefs.backupFrequency,
              dataRetentionYears: parseInt(systemPrefs.dataRetention),
            }),
          });
          // Also update theme in preferences
          await fetch('/api/settings/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ theme: systemPrefs.theme }),
          });
          break;
        default:
          setSaving(false);
          return;
      }

      if (!res?.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }

      showSuccess(`${section} settings saved successfully!`);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      showError(error.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTermSettings = async () => {
    setSaving(true);
    try {
      const promises = termSettings.map((ts) =>
        fetch('/api/settings/term', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            academicYear: academicSettings.currentAcademicYear,
            term: ts.term,
            closingDate: ts.closingDate || null,
            reopeningDate: ts.reopeningDate || null,
          }),
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter((res) => !res.ok);

      if (errors.length > 0) {
        throw new Error('Failed to save some term settings');
      }

      showSuccess('Term dates saved successfully!');
    } catch (error: any) {
      console.error('Failed to save term settings:', error);
      showError(error.message || 'Failed to save term dates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'school', label: 'School Information', icon: <School className="h-4 w-4" /> },
    { id: 'academic', label: 'Academic Settings', icon: <Calendar className="h-4 w-4" /> },
    { id: 'assessment', label: 'Assessment Structure', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'grading', label: 'Grading System', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'account', label: 'My Account', icon: <User className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'system', label: 'System Preferences', icon: <Database className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-4 md:space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
          Settings
        </h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          Manage system settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2 lg:sticky lg:top-20">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          {/* School Information */}
          {activeTab === 'school' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">School Information</h2>
                <button
                  onClick={() => handleSave('School Information')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.name}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={schoolInfo.phone}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={schoolInfo.website}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, website: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Academic Settings */}
          {activeTab === 'academic' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Academic Settings</h2>
                <button
                  onClick={() => handleSave('Academic Settings')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={academicSettings.currentAcademicYear}
                    onChange={(e) =>
                      setAcademicSettings({
                        ...academicSettings,
                        currentAcademicYear: e.target.value,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    {getAcademicYearOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Current academic year</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Term <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={academicSettings.currentTerm}
                    onChange={(e) =>
                      setAcademicSettings({ ...academicSettings, currentTerm: e.target.value })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 md:pt-6">
                <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3 md:mb-4">
                  Term Dates
                </h3>
                <div className="space-y-4">
                  {termSettings.map((termSetting, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm md:text-base text-gray-700">
                        Term {termSetting.term}
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Closing Date
                        </label>
                        <input
                          type="date"
                          value={termSetting.closingDate}
                          onChange={(e) => {
                            const updated = [...termSettings];
                            updated[index].closingDate = e.target.value;
                            setTermSettings(updated);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Reopening Date
                        </label>
                        <input
                          type="date"
                          value={termSetting.reopeningDate}
                          onChange={(e) => {
                            const updated = [...termSettings];
                            updated[index].reopeningDate = e.target.value;
                            setTermSettings(updated);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSaveTermSettings()}
                  disabled={saving}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Term Dates'}
                </button>
              </div>
            </div>
          )}

          {/* Assessment Structure */}
          {activeTab === 'assessment' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">
                    Assessment Structure
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    Configure the standard assessment structure used across all subjects
                  </p>
                </div>
                <button
                  onClick={() => handleSave('Assessment Structure')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-xs md:text-sm text-blue-800">
                  <strong>Note:</strong> This assessment structure applies to all subjects and classes.
                  Changes will affect future assessments only.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project (marks)
                  </label>
                  <input
                    type="number"
                    value={assessmentStructure.project}
                    onChange={(e) =>
                      setAssessmentStructure({
                        ...assessmentStructure,
                        project: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test 1 (marks)
                  </label>
                  <input
                    type="number"
                    value={assessmentStructure.test1}
                    onChange={(e) =>
                      setAssessmentStructure({
                        ...assessmentStructure,
                        test1: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test 2 (marks)
                  </label>
                  <input
                    type="number"
                    value={assessmentStructure.test2}
                    onChange={(e) =>
                      setAssessmentStructure({
                        ...assessmentStructure,
                        test2: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Work (marks)
                  </label>
                  <input
                    type="number"
                    value={assessmentStructure.groupWork}
                    onChange={(e) =>
                      setAssessmentStructure({
                        ...assessmentStructure,
                        groupWork: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Examination (marks)
                  </label>
                  <input
                    type="number"
                    value={assessmentStructure.exam}
                    onChange={(e) =>
                      setAssessmentStructure({
                        ...assessmentStructure,
                        exam: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={
                      assessmentStructure.project +
                      assessmentStructure.test1 +
                      assessmentStructure.test2 +
                      assessmentStructure.groupWork +
                      assessmentStructure.exam
                    }
                    disabled
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm md:text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Grading System */}
          {activeTab === 'grading' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">
                    Grading System
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    Configure the universal grading system used throughout the system
                  </p>
                </div>
                <button
                  onClick={() => router.push('/admin/settings/grading-system')}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Award className="h-4 w-4" />
                  Manage Grading System
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-blue-800">
                  <strong>Universal Grading System:</strong> The grading system you configure here will be used for all grade calculations throughout the system. Click "Manage Grading System" to view and modify grade levels.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Current Grade Levels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-green-800">HP</span>
                      <span className="text-xs text-green-600">High Proficient</span>
                    </div>
                    <p className="text-sm text-gray-700">80% - 100%</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-blue-800">P</span>
                      <span className="text-xs text-blue-600">Proficient</span>
                    </div>
                    <p className="text-sm text-gray-700">68% - 79%</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-yellow-800">AP</span>
                      <span className="text-xs text-yellow-600">Approaching Proficiency</span>
                    </div>
                    <p className="text-sm text-gray-700">54% - 67%</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-orange-800">D</span>
                      <span className="text-xs text-orange-600">Developing</span>
                    </div>
                    <p className="text-sm text-gray-700">40% - 53%</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-red-800">E</span>
                      <span className="text-xs text-red-600">Emerging</span>
                    </div>
                    <p className="text-sm text-gray-700">Below 40%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Account */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">My Account</h2>
                <button
                  onClick={() => handleSave('Account')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userAccount.name}
                    onChange={(e) => setUserAccount({ ...userAccount, name: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userAccount.email}
                    onChange={(e) => setUserAccount({ ...userAccount, email: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userAccount.phone}
                    onChange={(e) => setUserAccount({ ...userAccount, phone: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 md:pt-6">
                <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3 md:mb-4">
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={userAccount.currentPassword}
                      onChange={(e) =>
                        setUserAccount({ ...userAccount, currentPassword: e.target.value })
                      }
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={userAccount.newPassword}
                      onChange={(e) =>
                        setUserAccount({ ...userAccount, newPassword: e.target.value })
                      }
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={userAccount.confirmPassword}
                      onChange={(e) =>
                        setUserAccount({ ...userAccount, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">
                  Notification Settings
                </h2>
                <button
                  onClick={() => handleSave('Notifications')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {key === 'emailNotifications' && 'Receive email notifications'}
                        {key === 'gradeAlerts' && 'Get alerts when grades are entered'}
                        {key === 'attendanceAlerts' && 'Get alerts for attendance issues'}
                        {key === 'reportAlerts' && 'Get alerts when reports are generated'}
                        {key === 'systemUpdates' && 'Receive system update notifications'}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications({ ...notifications, [key]: !value })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Preferences */}
          {activeTab === 'system' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">
                  System Preferences
                </h2>
                <button
                  onClick={() => handleSave('System Preferences')}
                  disabled={saving}
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Backup</label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically backup data at scheduled intervals
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSystemPrefs({ ...systemPrefs, autoBackup: !systemPrefs.autoBackup })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      systemPrefs.autoBackup ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemPrefs.autoBackup ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {systemPrefs.autoBackup && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Frequency
                    </label>
                    <select
                      value={systemPrefs.backupFrequency}
                      onChange={(e) =>
                        setSystemPrefs({ ...systemPrefs, backupFrequency: e.target.value })
                      }
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Retention (years)
                  </label>
                  <input
                    type="number"
                    value={systemPrefs.dataRetention}
                    onChange={(e) =>
                      setSystemPrefs({ ...systemPrefs, dataRetention: e.target.value })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How long to keep student records after graduation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select
                    value={systemPrefs.theme}
                    onChange={(e) =>
                      setSystemPrefs({ ...systemPrefs, theme: e.target.value })
                    }
                    className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-4 md:pt-6">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3 md:mb-4">
                    Data Management
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                      Export All Data
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Create Backup
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

