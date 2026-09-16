#!/bin/bash
# Part 2 - Update remaining pages: Pre-Alerts, Jobs, Admin

set -e
cd /workspaces/logistics-hub || { echo "❌ Error: workspace not found"; exit 1; }

echo "🚀 Updating remaining pages (Pre-Alerts, Jobs, Admin)..."
echo ""

# Pre-AlertManager
echo "📝 Updating PreAlertManager.jsx..."
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

echo "✅ PreAlertManager updated"
echo ""

# JobDetailPage (assuming it exists, otherwise create as JobsList)
echo "📝 Updating JobDetailPage.jsx..."
cat > src/components/JobDetailPage.jsx << 'JOBEOF'
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import { useParams } from 'react-router-dom';
import Table from './Table';
import Card from './Card';
import Badge from './Badge';
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

echo "✅ JobDetailPage updated"
echo ""

# AdminPanel
echo "📝 Updating AdminPanel.jsx..."
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

echo "✅ AdminPanel updated"
echo ""

# PreAlertDetailPage
echo "📝 Updating PreAlertDetailPage.jsx..."
cat > src/components/PreAlertDetailPage.jsx << 'PREALERTDETAILEOF'
import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import { useParams } from 'react-router-dom';
import Card from './Card';
import { Ship, MapPin, Calendar } from 'lucide-react';

export default function PreAlertDetailPage() {
  const { alertId } = useParams();
  const { request } = useApi();
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const response = await request(`/api/pre-alerts/${alertId}`);
        if (response.success) {
          setAlert(response.data);
        }
      } catch (err) {
        console.error('Failed to load pre-alert:', err);
      }
    };
    if (alertId) fetchAlert();
  }, [alertId, request]);

  if (!alert) {
    return (
      <DashboardLayout pageTitle="Pre-Alert Details">
        <div className="text-center py-12">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={`Pre-Alert PA-${alertId || '1001'}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Ship size={24} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Vessel</p>
                <p className="text-lg font-bold text-gray-900">{alert.vessel_name || 'MSC GÜLSÜM'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <MapPin size={24} className="text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="text-lg font-bold text-gray-900">{alert.port || 'Hamburg'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">ETA</p>
                <p className="text-lg font-bold text-gray-900">{alert.eta || '2026-09-20'}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Containers</p>
              <p className="text-lg font-medium text-gray-900">{alert.container_count || 5}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Reference</p>
              <p className="text-lg font-medium text-gray-900">{alert.reference || 'SH-2026-001234'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <p className="text-lg font-medium text-gray-900">{alert.status || 'Received'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Alert Date</p>
              <p className="text-lg font-medium text-gray-900">{alert.alert_date || '2026-09-16'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-600">{alert.notes || 'No additional notes.'}</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
PREALERTDETAILEOF

echo "✅ PreAlertDetailPage updated"
echo ""

# Git commit
echo "📦 Committing changes..."
git add src/components/
git commit -m "Update remaining pages with DashboardLayout - Pre-Alerts, Jobs, Admin" || echo "No changes to commit"

echo ""
echo "✅ All remaining pages updated!"
echo ""
echo "📤 Push to GitHub:"
echo "   git push origin main"
