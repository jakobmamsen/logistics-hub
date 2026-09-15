// ============================================================================
// LOGISTICS HUB RELEASE 1 — AUDIT LOG VIEWER COMPONENT
// ============================================================================
// File: AuditLogViewer.jsx
// Purpose: View and search system audit trail
// Dependencies: React, useApi, useAuth
// Status: Production-ready for Release 1
//
// Features:
// 1. View all system operations
// 2. Filter by action type, user, resource
// 3. Search by entity ID or description
// 4. Date range filtering
// 5. Export audit logs
//
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { Badge } from './Badge';
import { Alert } from './Alert';
import { ChevronDown, Download, Search, Filter, Clock, User } from 'lucide-react';

/**
 * AuditLogViewer - View system audit trail
 * @component
 * @param {function} onLogsUpdate - Callback when logs load
 */
export default function AuditLogViewer({ onLogsUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { hasPermission } = useAuth();
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Action colors
  const actionColors = {
    create: 'bg-green-100 text-green-800',
    read: 'bg-blue-100 text-blue-800',
    update: 'bg-yellow-100 text-yellow-800',
    delete: 'bg-red-100 text-red-800',
    approve: 'bg-purple-100 text-purple-800',
    reject: 'bg-red-100 text-red-800',
    submit: 'bg-blue-100 text-blue-800'
  };

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      const response = await apiCall('GET', '/api/admin/audit-logs?limit=500');
      if (response.success) {
        setAuditLogs(response.data);
        if (onLogsUpdate) onLogsUpdate(response.data);
      }
    };

    fetchLogs();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let results = [...auditLogs];

    // Search query
    if (searchQuery.trim()) {
      results = results.filter(log =>
        log.entityId?.includes(searchQuery) ||
        log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userId?.includes(searchQuery)
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      results = results.filter(log => log.action === filterAction);
    }

    // User filter
    if (filterUser !== 'all') {
      results = results.filter(log => log.userId === filterUser);
    }

    // Resource filter
    if (filterResource !== 'all') {
      results = results.filter(log => log.resource === filterResource);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      results = results.filter(log => new Date(log.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      results = results.filter(log => new Date(log.createdAt) <= toDate);
    }

    setFilteredLogs(results);
  }, [auditLogs, searchQuery, filterAction, filterUser, filterResource, dateFrom, dateTo]);

  // Handle export logs
  const handleExportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Entity ID', 'Status', 'Changes'].join(','),
      ...filteredLogs.map(log =>
        [
          new Date(log.createdAt).toISOString(),
          log.userName,
          log.action,
          log.resource,
          log.entityId,
          log.status,
          JSON.stringify(log.changes || {})
        ].map(field => `"${field}"`.replace(/"/g, '""')).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setSuccessMessage('Audit logs exported');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Get unique values for filters
  const uniqueUsers = [...new Set(auditLogs.map(log => log.userId))];
  const uniqueResources = [...new Set(auditLogs.map(log => log.resource))];
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  const canViewAudit = hasPermission('audit', 'read');

  if (!canViewAudit) {
    return (
      <Alert type="error">
        You do not have permission to view audit logs.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Audit Log
          </h2>
          <p className="text-gray-600 mt-1">System activity and changes</p>
        </div>
        <Button
          onClick={handleExportLogs}
          variant="outline"
          icon={Download}
        >
          Export CSV
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert type="success">{successMessage}</Alert>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by entity ID, user, or description..."
            className="flex-1 bg-gray-50 border-0 text-sm focus:outline-none"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resource</label>
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Resources</option>
              {uniqueResources.map(resource => (
                <option key={resource} value={resource}>{resource}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        {/* Result Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {auditLogs.length} logs
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="hover:bg-gray-50 transition">
                {/* Log Header */}
                <button
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition ${
                          expandedLogId === log.id ? 'rotate-180' : ''
                        }`}
                      />
                      <Badge className={`${actionColors[log.action] || 'bg-gray-100 text-gray-800'} text-xs`}>
                        {log.action.toUpperCase()}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-800 text-xs">
                        {log.resource}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {log.entityId}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 ml-7 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      {log.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Success</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-xs">Failed</Badge>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedLogId === log.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">User</p>
                        <p className="text-sm text-gray-900">{log.userName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Timestamp</p>
                        <p className="text-sm text-gray-900">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Resource</p>
                        <p className="text-sm text-gray-900">{log.resource}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Entity ID</p>
                        <p className="text-sm text-gray-900 font-mono">{log.entityId}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {log.description && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                        <p className="text-sm text-gray-600">{log.description}</p>
                      </div>
                    )}

                    {/* Changes */}
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Changes</p>
                        <div className="bg-white rounded p-2 text-xs font-mono text-gray-600 overflow-auto max-h-40">
                          {Object.entries(log.changes).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-700">{key}:</span> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {log.status === 'failed' && log.errorMessage && (
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Error</p>
                        <p className="text-sm text-red-600">{log.errorMessage}</p>
                      </div>
                    )}

                    {/* IP Address */}
                    {log.ipAddress && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Source IP</p>
                        <p className="text-sm text-gray-900 font-mono">{log.ipAddress}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// END OF AuditLogViewer.jsx
// ============================================================================
