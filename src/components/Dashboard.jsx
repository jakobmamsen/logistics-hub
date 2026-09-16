import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Card from './Card';
import { BarChart3, Package, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const res = await fetch(`${API_BASE}/dashboard-api`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const payload = await res.json();
        if (!payload.success) throw new Error(payload.error || 'Request failed');

        if (!cancelled) {
          setMetrics(payload.data.metrics);
          setActivity(payload.data.activity || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  const tiles = [
    {
      label: 'Open Quotes',
      value: (metrics?.quotes?.draft ?? 0) + (metrics?.quotes?.sent ?? 0),
      sub: `${metrics?.quotes?.total ?? 0} total`,
      icon: BarChart3,
      colour: 'text-blue-600',
      to: '/quotes',
    },
    {
      label: 'Active Jobs',
      value: metrics?.jobs?.active ?? 0,
      sub: `${metrics?.jobs?.pending ?? 0} pending`,
      icon: Package,
      colour: 'text-green-600',
      to: '/jobs',
    },
    {
      label: 'Open Tasks',
      value: metrics?.tasks?.open ?? 0,
      sub: (metrics?.tasks?.overdue ?? 0) > 0
        ? `${metrics.tasks.overdue} overdue`
        : 'none overdue',
      icon: CheckCircle2,
      colour: 'text-orange-600',
      to: '/tasks',
    },
    {
      label: 'Open Exceptions',
      value: metrics?.exceptions?.open ?? 0,
      sub: (metrics?.exceptions?.critical ?? 0) > 0
        ? `${metrics.exceptions.critical} critical`
        : 'none critical',
      icon: AlertTriangle,
      colour: 'text-red-600',
      to: '/exceptions',
    },
  ];

  const dotColour = (type) =>
    type === 'quote' ? 'bg-blue-600'
    : type === 'job' ? 'bg-green-600'
    : 'bg-red-600';

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="space-y-6">

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn't load dashboard: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiles.map(({ label, value, sub, icon: Icon, colour, to }) => (
            <Card
              key={label}
              className="p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate(to)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{sub}</p>
                </div>
                <Icon size={28} className={colour} />
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
            <span className="text-xs text-gray-500">last 7 days</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics?.weekActivity?.quotes ?? 0}</p>
              <p className="text-sm text-gray-600">new quotes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics?.weekActivity?.jobs ?? 0}</p>
              <p className="text-sm text-gray-600">new jobs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics?.weekActivity?.tasks ?? 0}</p>
              <p className="text-sm text-gray-600">new tasks</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.slice(0, 6).map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${dotColour(item.type)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.action} &middot; {item.timestamp}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h3>
            <div className="space-y-3">
              {(metrics?.preAlerts?.pending ?? 0) > 0 && (
                <div
                  className="flex items-start gap-3 pb-3 border-b border-gray-200 cursor-pointer"
                  onClick={() => navigate('/pre-alerts')}
                >
                  <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {metrics.preAlerts.pending} pre-alert{metrics.preAlerts.pending === 1 ? '' : 's'} not yet sent
                    </p>
                    <p className="text-xs text-gray-500">Customs notification pending</p>
                  </div>
                </div>
              )}

              {(metrics?.exceptions?.open ?? 0) > 0 && (
                <div
                  className="flex items-start gap-3 pb-3 border-b border-gray-200 cursor-pointer"
                  onClick={() => navigate('/exceptions')}
                >
                  <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {metrics.exceptions.open} open exception{metrics.exceptions.open === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-gray-500">Unresolved shipment issues</p>
                  </div>
                </div>
              )}

              {(metrics?.tasks?.overdue ?? 0) > 0 && (
                <div
                  className="flex items-start gap-3 pb-3 border-b border-gray-200 cursor-pointer"
                  onClick={() => navigate('/tasks')}
                >
                  <CheckCircle2 size={16} className="text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {metrics.tasks.overdue} overdue task{metrics.tasks.overdue === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-gray-500">Past due date</p>
                  </div>
                </div>
              )}

              {(metrics?.preAlerts?.pending ?? 0) === 0 &&
               (metrics?.exceptions?.open ?? 0) === 0 &&
               (metrics?.tasks?.overdue ?? 0) === 0 && (
                <p className="text-sm text-gray-500">Nothing needs attention</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
