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
