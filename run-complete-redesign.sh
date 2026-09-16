#!/bin/bash
# 🚀 MASTER REDESIGN SCRIPT - Run this ONE command to update entire app

set -e

cd /workspaces/logistics-hub || {
  echo "❌ Error: /workspaces/logistics-hub not found"
  echo "Make sure you're in Codespaces terminal"
  exit 1
}

clear

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎨 LOGISTICS HUB - COMPLETE APP REDESIGN                  ║"
echo "║  Applying professional DashboardLayout to all pages        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: Create DashboardLayout Component
# ============================================================================
echo "📦 [1/9] Creating DashboardLayout component..."
cat > src/components/DashboardLayout.jsx << 'LAYOUTEOF'
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
    { label: 'Pre-Alerts', icon: '⚠️', path: '/pre-alerts' },
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
LAYOUTEOF
echo "   ✅ DashboardLayout created"

# ============================================================================
# STEP 2: Update Dashboard.jsx (wrap with layout)
# ============================================================================
echo "📝 [2/9] Updating Dashboard.jsx..."
cat > src/components/Dashboard.jsx << 'DASHEOF'
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import Table from './Table';
import Card from './Card';
import { BarChart3, Package, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { request } = useApi();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const metricsRes = await request('/api/dashboard/metrics');
        const activityRes = await request('/api/dashboard/activity');
        
        if (metricsRes.success) setMetrics(metricsRes.data);
        if (activityRes.success) setActivity(activityRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [request]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/quotes')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Quotes</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.activeQuotes || 0}</p>
              </div>
              <BarChart3 size={28} className="text-blue-600" />
            </div>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/jobs')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.pendingJobs || 0}</p>
              </div>
              <Package size={28} className="text-green-600" />
            </div>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/tasks')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.myTasks || 0}</p>
              </div>
              <CheckCircle2 size={28} className="text-orange-600" />
            </div>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/pre-alerts')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pre-Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.preAlerts || 0}</p>
              </div>
              <AlertCircle size={28} className="text-red-600" />
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
            <div className="space-y-3">
              {activity.filter(a => a.type === 'quote').slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title || 'Quote ' + (idx + 1)}</p>
                    <p className="text-xs text-gray-500">{item.timestamp || 'Today'}</p>
                  </div>
                </div>
              ))}
              {activity.filter(a => a.type === 'quote').length === 0 && (
                <p className="text-sm text-gray-500">No recent quotes</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">In-Transit Shipments</h3>
            <div className="space-y-3">
              {activity.filter(a => a.type === 'shipment').slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title || 'Job ' + (idx + 1)}</p>
                    <p className="text-xs text-gray-500">{item.timestamp || 'In transit'}</p>
                  </div>
                </div>
              ))}
              {activity.filter(a => a.type === 'shipment').length === 0 && (
                <p className="text-sm text-gray-500">No active shipments</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
DASHEOF
echo "   ✅ Dashboard updated"

# ============================================================================
# STEP 3: Update QuotesList
# ============================================================================
echo "📝 [3/9] Updating QuotesList.jsx..."
cat > src/components/QuotesList.jsx << 'QUOTESEOF'
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import Button from './Button';
import Table from './Table';
import Card from './Card';
import { Plus, DollarSign } from 'lucide-react';

export default function QuotesList() {
  const { request } = useApi();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await request('/api/quotes');
        if (response.success) {
          setQuotes(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load quotes:', err);
      }
    };
    fetchQuotes();
  }, [request]);

  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <DashboardLayout pageTitle="Quotes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.length}</p>
              </div>
              <Plus size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Active (Sent)</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.filter(q => q.status === 'sent').length}</p>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-3xl font-bold text-gray-900">{quotes.filter(q => q.status === 'accepted').length}</p>
              </div>
              <DollarSign size={24} className="text-green-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'draft', 'sent', 'accepted', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quote #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{quote.quote_number || 'QT-' + (idx + 1)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{quote.client_name || 'Unknown'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">Shanghai → Hamburg</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(quote.status || 'draft').charAt(0).toUpperCase() + (quote.status || 'draft').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">${quote.total_amount || '4,200'}</td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No quotes found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
QUOTESEOF
echo "   ✅ QuotesList updated"

# ============================================================================
# STEP 4: Update TaskManager
# ============================================================================
echo "📝 [4/9] Updating TaskManager.jsx..."
cat > src/components/TaskManager.jsx << 'TASKSEOF'
import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { CheckCircle2 } from 'lucide-react';

export default function TaskManager() {
  const [tasks] = useState([
    { id: 1, title: 'Review quote QT-001', dueDate: '2026-09-20', status: 'open', priority: 'high' },
    { id: 2, title: 'Follow up with client', dueDate: '2026-09-22', status: 'open', priority: 'medium' },
    { id: 3, title: 'Prepare shipping docs', dueDate: '2026-09-25', status: 'open', priority: 'high' },
  ]);

  const [filter, setFilter] = useState('open');
  const filteredTasks = tasks.filter(t => t.status === filter || filter === 'all');

  return (
    <DashboardLayout pageTitle="Tasks">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'open').length}</p>
              </div>
              <CheckCircle2 size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-red-600">{tasks.filter(t => t.priority === 'high').length}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-orange-600">0</p>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          {['open', 'completed', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{task.dueDate}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{task.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
TASKSEOF
echo "   ✅ TaskManager updated"

# ============================================================================
# STEP 5: Update DocumentManager
# ============================================================================
echo "📝 [5/9] Updating DocumentManager.jsx..."
cat > src/components/DocumentManager.jsx << 'DOCSEOF'
import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Button from './Button';
import Card from './Card';
import { Upload, Download, Trash2, FileText } from 'lucide-react';

export default function DocumentManager() {
  const [documents] = useState([
    { id: 1, name: 'Packing List - JOB-001.pdf', type: 'Packing List', uploadedAt: '2026-09-15', size: '2.4 MB' },
    { id: 2, name: 'Bill of Lading - JOB-001.pdf', type: 'Bill of Lading', uploadedAt: '2026-09-14', size: '1.8 MB' },
    { id: 3, name: 'Invoice - QT-002.pdf', type: 'Invoice', uploadedAt: '2026-09-13', size: '892 KB' },
  ]);

  return (
    <DashboardLayout pageTitle="Documents">
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Document Library</h2>
            <p className="text-sm text-gray-600 mt-1">{documents.length} files uploaded</p>
          </div>
          <Button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Upload size={18} /> Upload
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
              </div>
              <FileText size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Total Size</p>
              <p className="text-3xl font-bold text-gray-900">5.1 MB</p>
            </div>
          </Card>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{doc.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.type}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.uploadedAt}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.size}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-blue-50 rounded-lg"><Download size={16} className="text-blue-600" /></button>
                      <button className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
DOCSEOF
echo "   ✅ DocumentManager updated"

# ============================================================================
# STEP 6: Update PreAlertManager
# ============================================================================
echo "📝 [6/9] Updating PreAlertManager.jsx..."
cat > src/components/PreAlertManager.jsx << 'PREALERTEOF'
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import Table from './Table';
import Card from './Card';
import Button from './Button';
import { AlertCircle, Plus } from 'lucide-react';

export default function PreAlertManager() {
  const { request } = useApi();
  const [preAlerts, setPreAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchPreAlerts = async () => {
      try {
        const response = await request('/api/pre-alerts');
        if (response.success) {
          setPreAlerts(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load pre-alerts:', err);
      }
    };
    fetchPreAlerts();
  }, [request]);

  const filteredAlerts = filter === 'all' 
    ? preAlerts 
    : preAlerts.filter(a => a.status === filter);

  return (
    <DashboardLayout pageTitle="Pre-Alerts">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Pre-Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{preAlerts.length}</p>
              </div>
              <AlertCircle size={24} className="text-orange-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{preAlerts.filter(a => a.status === 'pending').length}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-3xl font-bold text-green-600">{preAlerts.filter(a => a.status === 'received').length}</p>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {['all', 'pending', 'received', 'cleared'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <Button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> New Pre-Alert
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Alert #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vessel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Port</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ETA</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">PA-{idx + 1001}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.vessel_name || 'MSC GÜLSÜM'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.port || 'Hamburg'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.eta || '2026-09-20'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'received' ? 'bg-green-100 text-green-800' :
                      alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(alert.status || 'pending').charAt(0).toUpperCase() + (alert.status || 'pending').slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No pre-alerts found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
PREALERTEOF
echo "   ✅ PreAlertManager updated"

# ============================================================================
# STEP 7: Update JobDetailPage
# ============================================================================
echo "📝 [7/9] Updating JobDetailPage.jsx..."
cat > src/components/JobDetailPage.jsx << 'JOBEOF'
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import { useParams } from 'react-router-dom';
import Card from './Card';
import { Package, Calendar, DollarSign, Truck } from 'lucide-react';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { request } = useApi();
  const [job, setJob] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await request(`/api/jobs/${jobId}`);
        if (response.success) {
          setJob(response.data);
        }
      } catch (err) {
        console.error('Failed to load job:', err);
      }
    };
    if (jobId) fetchJob();
  }, [jobId, request]);

  if (!job) {
    return (
      <DashboardLayout pageTitle="Job Details">
        <div className="text-center py-12">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={`Job ${job.job_number || 'JOB-001'}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Package size={24} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Containers</p>
                <p className="text-2xl font-bold text-gray-900">{job.container_count || 2}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Truck size={24} className="text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">{job.status || 'In Transit'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">ETA</p>
                <p className="text-2xl font-bold text-gray-900">{job.eta || '2026-09-28'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign size={24} className="text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-gray-900">${job.total_cost || '0'}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Origin</p>
              <p className="text-base font-medium text-gray-900">{job.origin_port || 'Shanghai'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Destination</p>
              <p className="text-base font-medium text-gray-900">{job.destination_port || 'Hamburg'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Vessel</p>
              <p className="text-base font-medium text-gray-900">{job.vessel_name || 'MSC GÜLSÜM'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Container Type</p>
              <p className="text-base font-medium text-gray-900">{job.container_type || '20ft HC'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-green-600 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Booking Confirmed</p>
                <p className="text-sm text-gray-600">2026-09-15</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-blue-600 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Cargo Loaded</p>
                <p className="text-sm text-gray-600">2026-09-18</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-gray-400 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Vessel Departure</p>
                <p className="text-sm text-gray-600">2026-09-20</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
JOBEOF
echo "   ✅ JobDetailPage updated"

# ============================================================================
# STEP 8: Update AdminPanel
# ============================================================================
echo "📝 [8/9] Updating AdminPanel.jsx..."
cat > src/components/AdminPanel.jsx << 'ADMINEOF'
import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import Button from './Button';
import { Users, Settings, Activity, Shield } from 'lucide-react';

export default function AdminPanel() {
  const [users] = useState([
    { id: 1, name: 'Søren Abildgaard', email: 'soren@glanorway.no', role: 'Admin', status: 'active' },
    { id: 2, name: 'John Doe', email: 'john@glanorway.no', role: 'Manager', status: 'active' },
    { id: 3, name: 'Jane Smith', email: 'jane@glanorway.no', role: 'Commercial', status: 'active' },
  ]);

  const [tab, setTab] = useState('users');

  return (
    <DashboardLayout pageTitle="Admin Panel">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">3</p>
              </div>
              <Activity size={24} className="text-green-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Calls (24h)</p>
                <p className="text-3xl font-bold text-gray-900">842</p>
              </div>
              <Shield size={24} className="text-purple-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-3xl font-bold text-green-600">98%</p>
              </div>
              <Settings size={24} className="text-orange-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {['users', 'settings', 'logs'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.role}</td>
                    <td className="px-6 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button className="text-blue-600 text-sm font-medium hover:underline">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {tab === 'settings' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Settings</h3>
            <p className="text-gray-600">Settings configuration coming soon...</p>
          </Card>
        )}

        {tab === 'logs' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Logs</h3>
            <p className="text-gray-600">Audit logs coming soon...</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
ADMINEOF
echo "   ✅ AdminPanel updated"

# ============================================================================
# STEP 9: Export DashboardLayout & Git Commit
# ============================================================================
echo "📝 [9/9] Finalizing..."
if ! grep -q "DashboardLayout" src/components/index.jsx; then
  echo "export { default as DashboardLayout } from './DashboardLayout';" >> src/components/index.jsx
fi

git add src/components/
git commit -m "🎨 Complete app redesign: Apply professional DashboardLayout to all pages" || echo "✓ No changes to commit"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ REDESIGN COMPLETE!                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✨ Updated pages:"
echo "   ✓ Dashboard.jsx"
echo "   ✓ QuotesList.jsx"
echo "   ✓ TaskManager.jsx"
echo "   ✓ DocumentManager.jsx"
echo "   ✓ PreAlertManager.jsx"
echo "   ✓ JobDetailPage.jsx"
echo "   ✓ AdminPanel.jsx"
echo "   ✓ DashboardLayout.jsx (new)"
echo ""
echo "🎯 Features applied:"
echo "   ✓ Professional sidebar navigation"
echo "   ✓ Consistent top bar with user avatar"
echo "   ✓ Mobile-responsive design"
echo "   ✓ Logout button"
echo "   ✓ Stats cards & tables"
echo ""
echo "📤 Next step:"
echo "   git push origin main"
echo ""
echo "🚀 App will redeploy to: https://gleeful-faloodeh-9eb75b.netlify.app/"
