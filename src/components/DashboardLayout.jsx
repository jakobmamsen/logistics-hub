import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, LogOut } from 'lucide-react';

export default function DashboardLayout({ children, pageTitle }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', icon: '📊', path: '/' },
    { label: 'Quotes', icon: '💼', path: '/quotes' },
    { label: 'Jobs', icon: '📦', path: '/jobs' },
    { label: 'Pre-Alerts', icon: '⚠️', path: '/alerts' },
    { label: 'Documents', icon: '📄', path: '/documents' },
    { label: 'Tasks', icon: '✓', path: '/tasks' },
    { label: 'Admin', icon: '⚙️', path: '/admin' },
  ];

  const isActive = (path) => {
    const currentPath = window.location.pathname;
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-60 bg-white border-r border-gray-200 shadow-sm`}>
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-8">GLA Norway</div>
          <nav className="space-y-2">
            {menuItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 cursor-pointer transition ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{currentUser?.name || 'User'}</span>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Logout"
              >
                <LogOut size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
