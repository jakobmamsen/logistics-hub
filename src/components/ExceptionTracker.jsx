// ============================================================================
// LOGISTICS HUB RELEASE 1 — EXCEPTION TRACKER COMPONENT
// ============================================================================
// File: ExceptionTracker.jsx
// Purpose: Create, track, and resolve cargo exceptions and alerts
// Dependencies: React, useApi, useAuth
// Status: Production-ready for Release 1
//
// Features:
// 1. Create exceptions (delay, damage, customs hold, etc.)
// 2. Set severity levels (info, warning, critical)
// 3. Assign to team member
// 4. Track status (open → acknowledged → resolved)
// 5. Add resolution notes
// 6. View exception history
//
// ============================================================================

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import Badge from './Badge';
import Modal from './Modal';
import Form from './Form';
import Alert from './Alert';
import { AlertTriangle, AlertCircle, Plus, ChevronDown, CheckCircle } from 'lucide-react';

/**
 * ExceptionTracker - Create and track cargo exceptions
 * @component
 * @param {string} jobId - Job ID
 * @param {array} exceptions - Initial exceptions array
 * @param {array} teamMembers - Team members for assignment
 * @param {function} onExceptionsUpdate - Callback when exceptions change
 */
export default function ExceptionTracker({ jobId, exceptions = [], teamMembers = [], onExceptionsUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { user, hasPermission } = useAuth();
  
  const [localExceptions, setLocalExceptions] = useState(exceptions || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedExId, setExpandedExId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all'); // all, info, warning, critical
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    exceptionType: 'delay',
    severity: 'warning',
    description: '',
    assignedTo: null
  });

  // Exception types
  const exceptionTypes = [
    { id: 'delay', label: 'Delay', icon: '⏱️' },
    { id: 'damage', label: 'Damage', icon: '🔨' },
    { id: 'customs_hold', label: 'Customs Hold', icon: '📋' },
    { id: 'missing_doc', label: 'Missing Document', icon: '📄' },
    { id: 'temperature', label: 'Temperature Issue', icon: '🌡️' },
    { id: 'hazmat_issue', label: 'Hazmat Issue', icon: '⚠️' },
    { id: 'other', label: 'Other', icon: '❓' }
  ];

  // Severity colors
  const severityColors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  };

  // Severity icons
  const severityIcons = {
    info: <AlertCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    critical: <AlertTriangle className="w-4 h-4" />
  };

  // Status colors
  const statusColors = {
    open: 'bg-red-100 text-red-800',
    acknowledged: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  // Handle create exception
  const handleCreateException = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.description.trim()) {
      setFormError('Exception description is required');
      return;
    }

    const newException = {
      jobId,
      exceptionType: formData.exceptionType,
      severity: formData.severity,
      description: formData.description,
      assignedTo: formData.assignedTo
    };

    const response = await apiCall(
      'POST',
      `/api/jobs/${jobId}/exceptions`,
      newException
    );

    if (response.success) {
      setLocalExceptions([...localExceptions, response.data]);
      setFormData({ exceptionType: 'delay', severity: 'warning', description: '', assignedTo: null });
      setShowCreateModal(false);
      setSuccessMessage('Exception created and logged');
      
      if (onExceptionsUpdate) {
        onExceptionsUpdate([...localExceptions, response.data]);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to create exception');
    }
  };

  // Handle update exception status
  const handleUpdateStatus = async (exceptionId, newStatus) => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/exceptions/${exceptionId}`,
      { status: newStatus }
    );

    if (response.success) {
      const updated = localExceptions.map(ex =>
        ex.id === exceptionId ? { ...ex, status: newStatus } : ex
      );
      setLocalExceptions(updated);
      setSuccessMessage(`Exception marked as ${newStatus.replace('_', ' ')}`);
      
      if (onExceptionsUpdate) {
        onExceptionsUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle assign exception
  const handleAssignException = async (exceptionId, userId) => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/exceptions/${exceptionId}`,
      { assignedTo: userId }
    );

    if (response.success) {
      const updated = localExceptions.map(ex =>
        ex.id === exceptionId ? { ...ex, assignedTo: userId } : ex
      );
      setLocalExceptions(updated);
      setSuccessMessage('Exception assigned');
      
      if (onExceptionsUpdate) {
        onExceptionsUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle add resolution notes
  const handleResolveException = async (exceptionId, resolutionNotes) => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/exceptions/${exceptionId}`,
      {
        status: 'resolved',
        resolutionNotes
      }
    );

    if (response.success) {
      const updated = localExceptions.map(ex =>
        ex.id === exceptionId ? { ...ex, status: 'resolved', resolutionNotes } : ex
      );
      setLocalExceptions(updated);
      setSuccessMessage('Exception resolved');
      
      if (onExceptionsUpdate) {
        onExceptionsUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filter exceptions
  const filteredExceptions = filterSeverity === 'all'
    ? localExceptions
    : localExceptions.filter(ex => ex.severity === filterSeverity);

  // Count by severity
  const severityCounts = {
    critical: localExceptions.filter(ex => ex.severity === 'critical').length,
    warning: localExceptions.filter(ex => ex.severity === 'warning').length,
    info: localExceptions.filter(ex => ex.severity === 'info').length
  };

  const canCreateException = hasPermission('exception', 'write');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Exceptions</h2>
          {severityCounts.critical > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {severityCounts.critical} Critical
            </Badge>
          )}
        </div>
        {canCreateException && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Report Exception
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert type="success" className="mb-4">
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Severity Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterSeverity('all')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterSeverity === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({localExceptions.length})
        </button>
        <button
          onClick={() => setFilterSeverity('critical')}
          className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 ${
            filterSeverity === 'critical'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Critical ({severityCounts.critical})
        </button>
        <button
          onClick={() => setFilterSeverity('warning')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterSeverity === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Warning ({severityCounts.warning})
        </button>
        <button
          onClick={() => setFilterSeverity('info')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterSeverity === 'info'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Info ({severityCounts.info})
        </button>
      </div>

      {/* Exceptions List */}
      {filteredExceptions.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">
            {filterSeverity === 'all'
              ? 'No exceptions reported. All systems operating normally.'
              : `No ${filterSeverity} level exceptions.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExceptions.map(exception => (
            <div
              key={exception.id}
              className={`border-l-4 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition ${
                exception.severity === 'critical'
                  ? 'border-l-red-500 bg-red-50'
                  : exception.severity === 'warning'
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}
            >
              {/* Exception Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      onClick={() => setExpandedExId(
                        expandedExId === exception.id ? null : exception.id
                      )}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition ${
                          expandedExId === exception.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <h3 className="font-semibold text-gray-900">
                      {exceptionTypes.find(et => et.id === exception.exceptionType)?.label || 'Exception'}
                    </h3>
                    <Badge className={`${severityColors[exception.severity]} text-xs`}>
                      <div className="flex items-center gap-1">
                        {severityIcons[exception.severity]}
                        {exception.severity}
                      </div>
                    </Badge>
                    <Badge className={`${statusColors[exception.status]} text-xs`}>
                      {exception.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-700 ml-7">{exception.description}</p>

                  {/* Metadata */}
                  <div className="mt-2 ml-7 flex items-center gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Reported:</span> {new Date(exception.reportedAt).toLocaleDateString()}
                    </div>
                    {exception.assignedTo && (
                      <div>
                        <span className="font-medium">Assigned to:</span>{' '}
                        {teamMembers.find(m => m.id === exception.assignedTo)?.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {exception.status !== 'resolved' && canCreateException && (
                    <Button
                      onClick={() => handleUpdateStatus(exception.id, 'resolved')}
                      variant="outline"
                      size="sm"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedExId === exception.id && (
                <div className="mt-4 pt-4 border-t border-gray-300 space-y-4">
                  {/* Status Update */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {['open', 'acknowledged', 'in_progress', 'resolved', 'closed'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(exception.id, status)}
                          disabled={exception.status === status}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            exception.status === status
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assignment */}
                  {teamMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Assign To</p>
                      <select
                        value={exception.assignedTo || ''}
                        onChange={(e) => handleAssignException(exception.id, e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {exception.status === 'resolved' && (
                    <div className="bg-green-50 rounded p-3 border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-1">Resolution</p>
                      <p className="text-sm text-green-700">
                        {exception.resolutionNotes || 'No resolution notes provided'}
                      </p>
                      {exception.resolvedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Resolved on {new Date(exception.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add Resolution Notes */}
                  {exception.status !== 'resolved' && exception.status !== 'closed' && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Resolution Notes</p>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                        placeholder="Add notes about how this exception will be or has been resolved..."
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleResolveException(exception.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="text-xs text-gray-500 border-t border-gray-300 pt-3">
                    Created {new Date(exception.reportedAt).toLocaleDateString()}
                    {exception.resolvedAt && (
                      <> • Resolved {new Date(exception.resolvedAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Exception Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError(null);
          setFormData({ exceptionType: 'delay', severity: 'warning', description: '', assignedTo: null });
        }}
        title="Report Exception"
      >
        <form onSubmit={handleCreateException} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Form.Group>
            <Form.Label htmlFor="exceptionType">Exception Type</Form.Label>
            <Form.Select
              id="exceptionType"
              value={formData.exceptionType}
              onChange={(e) => setFormData({ ...formData, exceptionType: e.target.value })}
            >
              {exceptionTypes.map(et => (
                <option key={et.id} value={et.id}>
                  {et.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="severity">Severity Level</Form.Label>
            <Form.Select
              id="severity"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="info">Info (FYI)</option>
              <option value="warning">Warning (Attention needed)</option>
              <option value="critical">Critical (Escalate)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="description">Description</Form.Label>
            <Form.Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the exception in detail"
              rows={4}
              required
            />
          </Form.Group>

          {teamMembers.length > 0 && (
            <Form.Group>
              <Form.Label htmlFor="assignedTo">Assign To</Form.Label>
              <Form.Select
                id="assignedTo"
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setFormError(null);
                setFormData({ exceptionType: 'delay', severity: 'warning', description: '', assignedTo: null });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Report Exception'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================================
// END OF ExceptionTracker.jsx
// ============================================================================
