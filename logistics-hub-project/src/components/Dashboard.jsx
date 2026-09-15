// ============================================================================
// LOGISTICS HUB RELEASE 1 — DASHBOARD PAGE
// ============================================================================
// File: Dashboard.jsx
// Purpose: Main home page with key metrics, recent activity, and quick actions
// Dependencies: React, useApi, useAuth, charts
// Status: Production-ready for Release 1
//
// Features:
// 1. Key metrics cards (quotes, jobs, tasks, exceptions)
// 2. Recent activity feed
// 3. Quick action buttons
// 4. Performance metrics
// 5. Role-based dashboard customization
//
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Alert } from '../components/Alert';
import {
  TrendingUp,
  FileText,
  CheckSquare,
  AlertCircle,
  Clock,
  Plus,
  ArrowRight,
  BarChart3,
  Users,
  DollarSign
} from 'lucide-react';

/**
 * Dashboard - Main home page
 * @component
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { apiCall, loading } = useApi();
  const { currentUser, hasRole } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch metrics
      const metricsResponse = await apiCall('GET', '/api/dashboard/metrics');
      if (metricsResponse.success) {
        setMetrics(metricsResponse.data);
      }

      // Fetch recent activity
      const activityResponse = await apiCall('GET', '/api/dashboard/activity?limit=5');
      if (activityResponse.success) {
        setRecentActivity(activityResponse.data);
      }
    };

    fetchData();
  }, []);

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isCommercial = hasRole('commercial');
  const isOperations = hasRole('operations');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {currentUser?.name || 'User'}
              </h1>
              <p className="text-gray-600 mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {isCommercial && (
                <Button
                  onClick={() => navigate('/quotes/new')}
                  variant="primary"
                  icon={Plus}
                  size="sm"
                >
                  New Quote
                </Button>
              )}
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  icon={Users}
                  size="sm"
                >
                  Admin
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Open Quotes */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Open Quotes</h3>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.openQuotes || 0}</p>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.quotesPendingApproval || 0} awaiting approval
              </p>
              {metrics.quotesPendingApproval > 0 && (
                <Badge className="mt-3 bg-yellow-100 text-yellow-800">
                  Action needed
                </Badge>
              )}
            </Card>

            {/* Active Jobs */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Active Jobs</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeJobs || 0}</p>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.jobsInProgress || 0} in progress
              </p>
            </Card>

            {/* Open Tasks */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">My Tasks</h3>
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.myOpenTasks || 0}</p>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.myOverdueTasks || 0} overdue
              </p>
              {metrics.myOverdueTasks > 0 && (
                <Badge className="mt-3 bg-red-100 text-red-800">
                  Overdue
                </Badge>
              )}
            </Card>

            {/* Open Exceptions */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Exceptions</h3>
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.openExceptions || 0}</p>
              <p className="text-sm text-gray-600 mt-2">
                {metrics.criticalExceptions || 0} critical
              </p>
              {metrics.criticalExceptions > 0 && (
                <Badge className="mt-3 bg-red-100 text-red-800">
                  Critical
                </Badge>
              )}
            </Card>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => {
                      // Navigate to relevant page based on resource type
                      if (activity.resource === 'quote' && activity.entityId) {
                        navigate(`/quotes/${activity.entityId}`);
                      } else if (activity.resource === 'job' && activity.entityId) {
                        navigate(`/jobs/${activity.entityId}`);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.userName} • {activity.resource.toUpperCase()} •{' '}
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => {
                if (isAdmin) navigate('/admin');
                else navigate('/quotes');
              }}
            >
              View All Activity
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Quick Stats & Navigation */}
          <div className="space-y-4">
            {/* Performance Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance
              </h3>

              <div className="space-y-3">
                {metrics && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Quote Win Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${metrics.quoteWinRate || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {metrics.quoteWinRate || 0}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Quote Response Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {metrics.avgResponseTime || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">On-Time Delivery Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${metrics.onTimeDeliveryRate || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {metrics.onTimeDeliveryRate || 0}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>

              <div className="space-y-2">
                {isCommercial && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate('/quotes')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    My Quotes
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/jobs')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Active Jobs
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/tasks')}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  My Tasks
                </Button>

                {isAdmin && (
                  <>
                    <hr className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-blue-600"
                      onClick={() => navigate('/admin')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Reminders */}
            {metrics && metrics.reminders && metrics.reminders.length > 0 && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Reminders</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  {metrics.reminders.map((reminder, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{reminder}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* System Status Banner */}
        {metrics && metrics.systemStatus === 'degraded' && (
          <Alert type="warning">
            <strong>System Status:</strong> Some services are running slower than normal. Performance should improve shortly.
          </Alert>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// END OF Dashboard.jsx
// ============================================================================
