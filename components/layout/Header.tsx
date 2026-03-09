'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
      setShowProfileMenu(false);
    // Clear state and redirect immediately using window.location for faster redirect
    logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 lg:fixed lg:left-auto lg:right-auto lg:top-0 z-40 flex-shrink-0 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-full pl-12 lg:pl-2 sm:pl-14 pr-2 sm:pr-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0 max-w-[calc(100%-120px)] sm:max-w-none">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Hohoe Experimental Schools Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block min-w-0 max-w-[120px] md:max-w-none">
            <h1 className="text-[10px] sm:text-xs md:text-base font-bold text-gray-900 leading-tight truncate">
              HOHOE EXPERIMENTAL SCHOOLS
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 leading-tight truncate">School Management System</p>
          </div>
        </div>

        {/* Center: Search Bar (Desktop only) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-2 md:mx-4 min-w-0">
          <div className="relative w-full min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="block w-full pl-9 md:pl-10 pr-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs md:text-sm min-w-0"
            />
          </div>
        </div>

        {/* Right: Notifications and Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-4 flex-shrink-0">
          {/* Notifications */}
          <button className="relative p-1.5 md:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-4 w-4 md:h-6 md:w-6" />
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 md:h-2 md:w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-xs md:text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.name || 'User'}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

