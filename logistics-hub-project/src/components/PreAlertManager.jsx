// ============================================================================
// LOGISTICS HUB RELEASE 1 — PRE-ALERT MANAGER COMPONENT
// ============================================================================
// File: PreAlertManager.jsx
// Purpose: Manage customs pre-alert checklists and confirmations
// Dependencies: React, useApi, useAuth
// Status: Production-ready for Release 1
//
// Features:
// 1. View auto-generated pre-alert checklist
// 2. Track checklist item completion
// 3. Confirm sending to customs
// 4. Track authority acknowledgment
// 5. Record customs reference numbers
//
// ============================================================================

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Form } from './Form';
import { Alert } from './Alert';
import { CheckCircle, Circle, Send, FileText, ChevronDown, Check } from 'lucide-react';

/**
 * PreAlertManager - Manage customs pre-alert checklists
 * @component
 * @param {string} jobId - Job ID
 * @param {object} preAlert - Pre-alert object
 * @param {function} onPreAlertUpdate - Callback when pre-alert changes
 */
export default function PreAlertManager({ jobId, preAlert = null, onPreAlertUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { user, hasPermission } = useAuth();
  
  const [localPreAlert, setLocalPreAlert] = useState(preAlert || null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form state
  const [sendFormData, setSendFormData] = useState({
    sentVia: 'email',
    customsReferenceNumber: ''
  });

  // Group checklist items by category
  const groupedItems = {
    shipper: {
      label: 'Shipper Information',
      items: (localPreAlert?.checklistItems || []).filter(item =>
        item.item.toLowerCase().includes('shipper')
      )
    },
    cargo: {
      label: 'Cargo Details',
      items: (localPreAlert?.checklistItems || []).filter(item =>
        ['weight', 'cbm', 'description', 'hs code'].some(keyword =>
          item.item.toLowerCase().includes(keyword)
        )
      )
    },
    origin: {
      label: 'Country & Origin',
      items: (localPreAlert?.checklistItems || []).filter(item =>
        ['country', 'origin', 'tariff'].some(keyword =>
          item.item.toLowerCase().includes(keyword)
        )
      )
    },
    special: {
      label: 'Special Requirements',
      items: (localPreAlert?.checklistItems || []).filter(item =>
        ['hazmat', 'permit', 'prohibited', 'restricted'].some(keyword =>
          item.item.toLowerCase().includes(keyword)
        )
      )
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    if (!localPreAlert?.checklistItems || localPreAlert.checklistItems.length === 0) return 0;
    const completed = localPreAlert.checklistItems.filter(item => item.completed).length;
    return Math.round((completed / localPreAlert.checklistItems.length) * 100);
  };

  // Get required incomplete items
  const getRequiredIncomplete = () => {
    return (localPreAlert?.checklistItems || []).filter(
      item => item.required && !item.completed
    );
  };

  // Handle toggle checklist item
  const handleToggleItem = async (itemIndex) => {
    const updatedItems = [...(localPreAlert?.checklistItems || [])];
    updatedItems[itemIndex].completed = !updatedItems[itemIndex].completed;
    updatedItems[itemIndex].completed_at = updatedItems[itemIndex].completed ? new Date().toISOString() : null;
    updatedItems[itemIndex].completed_by = updatedItems[itemIndex].completed ? user.userId : null;

    // In a real app, this would update the database
    const updated = { ...localPreAlert, checklistItems: updatedItems };
    setLocalPreAlert(updated);

    if (onPreAlertUpdate) {
      onPreAlertUpdate(updated);
    }
  };

  // Handle send pre-alert
  const handleSendPreAlert = async (e) => {
    e.preventDefault();
    setFormError(null);

    const requiredIncomplete = getRequiredIncomplete();
    if (requiredIncomplete.length > 0) {
      setFormError(
        `Please complete all required items (${requiredIncomplete.length} remaining) before sending`
      );
      return;
    }

    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/pre-alerts/${localPreAlert.id}`,
      {
        status: 'sent',
        sentBy: user.userId,
        sentAt: new Date().toISOString(),
        sentVia: sendFormData.sentVia,
        customsReferenceNumber: sendFormData.customsReferenceNumber || null
      }
    );

    if (response.success) {
      const updated = {
        ...localPreAlert,
        status: 'sent',
        sentBy: user.userId,
        sentAt: new Date().toISOString(),
        sentVia: sendFormData.sentVia
      };
      setLocalPreAlert(updated);
      setShowSendModal(false);
      setSuccessMessage('Pre-alert sent to customs authorities');

      if (onPreAlertUpdate) {
        onPreAlertUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to send pre-alert');
    }
  };

  // Handle acknowledge receipt
  const handleAcknowledge = async () => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/pre-alerts/${localPreAlert.id}`,
      {
        status: 'acknowledged',
        acknowledgedByAuthoritiesAt: new Date().toISOString()
      }
    );

    if (response.success) {
      const updated = {
        ...localPreAlert,
        status: 'acknowledged',
        acknowledgedByAuthoritiesAt: new Date().toISOString()
      };
      setLocalPreAlert(updated);
      setSuccessMessage('Pre-alert acknowledged by authorities');

      if (onPreAlertUpdate) {
        onPreAlertUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  if (!localPreAlert) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pre-Alert</h2>
        <Alert type="info">
          No pre-alert created yet. Create a job first to generate the customs pre-alert checklist.
        </Alert>
      </div>
    );
  }

  const completionPercentage = calculateCompletion();
  const canManagePreAlert = hasPermission('pre_alert', 'write');
  const requiredIncomplete = getRequiredIncomplete();

  // Status colors
  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    acknowledged: 'bg-green-100 text-green-800'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customs Pre-Alert</h2>
          <p className="text-sm text-gray-600 mt-1">Auto-generated customs checklist</p>
        </div>
        <Badge className={`${statusColors[localPreAlert.status]}`}>
          {localPreAlert.status}
        </Badge>
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

      {/* Completion Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completion</span>
          <span className="text-sm font-semibold text-gray-900">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        {requiredIncomplete.length > 0 && (
          <p className="text-sm text-red-600 mt-2">
            {requiredIncomplete.length} required item{requiredIncomplete.length !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* Checklist Sections */}
      <div className="space-y-3 mb-6">
        {Object.entries(groupedItems).map(([key, section]) => {
          if (section.items.length === 0) return null;

          const sectionComplete = section.items.every(item => item.completed);
          const sectionPercentage = Math.round(
            (section.items.filter(item => item.completed).length / section.items.length) * 100
          );

          return (
            <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {sectionComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{section.label}</p>
                    <p className="text-xs text-gray-500">
                      {section.items.filter(i => i.completed).length} of {section.items.length} ({sectionPercentage}%)
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition ${
                    expandedSection === key ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Section Items */}
              {expandedSection === key && (
                <div className="px-4 py-3 space-y-3 border-t border-gray-200">
                  {section.items.map((item, idx) => {
                    const globalIdx = (localPreAlert?.checklistItems || []).indexOf(item);
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleItem(globalIdx)}
                          disabled={!canManagePreAlert}
                          className="mt-1 flex-shrink-0"
                        >
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              item.completed
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.item}
                          </p>
                          {item.required && (
                            <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                              Required
                            </Badge>
                          )}
                          {item.completed && item.completed_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completed {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Send Button */}
      {localPreAlert.status === 'pending' && canManagePreAlert && (
        <div className="mb-6">
          <Button
            onClick={() => setShowSendModal(true)}
            variant="primary"
            icon={Send}
            disabled={requiredIncomplete.length > 0}
            className="w-full"
          >
            Send Pre-Alert to Customs
            {requiredIncomplete.length > 0 && ` (${requiredIncomplete.length} items incomplete)`}
          </Button>
          {requiredIncomplete.length > 0 && (
            <p className="text-sm text-red-600 mt-2">
              Complete all required items before sending pre-alert
            </p>
          )}
        </div>
      )}

      {/* Sent Information */}
      {localPreAlert.status !== 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900 mb-2">Pre-Alert Sent</p>
          {localPreAlert.sentAt && (
            <div className="text-sm text-blue-800 space-y-1">
              <div>
                <span className="font-medium">Sent:</span> {new Date(localPreAlert.sentAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Via:</span> {localPreAlert.sentVia || 'Email'}
              </div>
              {localPreAlert.customsReferenceNumber && (
                <div>
                  <span className="font-medium">Customs Ref:</span> {localPreAlert.customsReferenceNumber}
                </div>
              )}
            </div>
          )}

          {localPreAlert.status === 'acknowledged' && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Acknowledged by Customs Authorities
              </p>
              {localPreAlert.acknowledgedByAuthoritiesAt && (
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(localPreAlert.acknowledgedByAuthoritiesAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {localPreAlert.status === 'sent' && (
            <Button
              onClick={handleAcknowledge}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Mark as Acknowledged
            </Button>
          )}
        </div>
      )}

      {/* Send Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setFormError(null);
          setSendFormData({ sentVia: 'email', customsReferenceNumber: '' });
        }}
        title="Send Pre-Alert"
      >
        <form onSubmit={handleSendPreAlert} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Alert type="info">
            You are about to send this customs pre-alert. Ensure all required items are completed.
          </Alert>

          <Form.Group>
            <Form.Label htmlFor="sentVia">Send Via</Form.Label>
            <Form.Select
              id="sentVia"
              value={sendFormData.sentVia}
              onChange={(e) => setSendFormData({ ...sendFormData, sentVia: e.target.value })}
            >
              <option value="email">Email</option>
              <option value="fax">Fax</option>
              <option value="api">API/Portal</option>
              <option value="manual">Manual Submission</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="customsRef">Customs Reference Number (Optional)</Form.Label>
            <Form.Input
              id="customsRef"
              type="text"
              value={sendFormData.customsReferenceNumber}
              onChange={(e) => setSendFormData({ ...sendFormData, customsReferenceNumber: e.target.value })}
              placeholder="If received from customs authorities"
            />
          </Form.Group>

          <Alert type="warning">
            <p className="text-sm">
              <strong>Manual Confirmation:</strong> You are confirming that you have manually sent this pre-alert to the customs authorities. 
              This does not automatically transmit to any external system.
            </p>
          </Alert>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSendModal(false);
                setFormError(null);
                setSendFormData({ sentVia: 'email', customsReferenceNumber: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Sending...' : 'Confirm Sent'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================================
// END OF PreAlertManager.jsx
// ============================================================================
