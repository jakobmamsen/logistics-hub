/**
 * PreAlertDetailPage.jsx
 * Phase 3 Week 3: Pre-Alert Detail & Checklist Management
 * 
 * Features:
 *   - View pre-alert info (customer, route, service)
 *   - Manage checklist (complete, add, delete items)
 *   - Real-time completion tracking
 *   - Critical items gate (can't mark ready without them)
 *   - Approval timeline
 *   - Status transitions (draft → ready → in_progress → completed)
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Badge, Modal, Notification, Alert } from '../components'
import { usePreAlert } from '../hooks/usePreAlerts'

export default function PreAlertDetailPage() {
  const { preAlertId } = useParams()
  const navigate = useNavigate()
  const {
    preAlert,
    checklistItems,
    completionStats,
    criticalStatus,
    auditTrail,
    isLoading,
    error,
    completeChecklistItem,
    startChecklistItem,
    markNotApplicable,
    addChecklistItem,
    deleteChecklistItem,
    markReady,
    markInProgress,
    markCompleted,
    cancel,
  } = usePreAlert(preAlertId)

  const [notification, setNotification] = useState(null)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('other')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusAction, setStatusAction] = useState(null)
  const [itemNotes, setItemNotes] = useState({})

  // ===== HANDLERS =====

  const handleCompleteItem = async (itemId, notes = '') => {
    const { error: err } = await completeChecklistItem(itemId, notes)
    if (err) {
      setNotification({ type: 'error', message: `Error: ${err}` })
    } else {
      setNotification({
        type: 'success',
        message: 'Checklist item marked complete',
      })
    }
  }

  const handleAddItem = async () => {
    if (!newItemDescription.trim()) {
      setNotification({ type: 'error', message: 'Description required' })
      return
    }

    const { error: err } = await addChecklistItem(
      newItemDescription,
      newItemCategory
    )
    if (err) {
      setNotification({ type: 'error', message: `Error: ${err}` })
    } else {
      setNotification({ type: 'success', message: 'Item added' })
      setNewItemDescription('')
      setNewItemCategory('other')
      setShowAddItemModal(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this checklist item?')) return

    const { error: err } = await deleteChecklistItem(itemId)
    if (err) {
      setNotification({ type: 'error', message: `Error: ${err}` })
    } else {
      setNotification({ type: 'success', message: 'Item deleted' })
    }
  }

  const handleStatusChange = async () => {
    let result
    switch (statusAction) {
      case 'ready':
        result = await markReady()
        break
      case 'in_progress':
        result = await markInProgress()
        break
      case 'completed':
        result = await markCompleted()
        break
      case 'cancelled':
        result = await cancel()
        break
      default:
        return
    }

    if (result.error) {
      setNotification({ type: 'error', message: `Error: ${result.error}` })
    } else {
      setNotification({
        type: 'success',
        message: `Status updated to ${statusAction}`,
      })
      setShowStatusModal(false)
      setStatusAction(null)
    }
  }

  // ===== RENDER HELPERS =====

  const getItemStatusBadge = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      not_applicable: 'bg-yellow-100 text-yellow-700',
      waived: 'bg-purple-100 text-purple-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      documentation: '📋',
      customs: '🏛️',
      carrier: '🚢',
      shipping: '📦',
      other: '⚙️',
    }
    return icons[category] || '•'
  }

  const canMarkReady = () => {
    return (
      preAlert?.status === 'draft' && criticalStatus?.can_ready === true
    )
  }

  const canStartProgress = () => {
    return preAlert?.status === 'ready'
  }

  const canComplete = () => {
    return preAlert?.status === 'in_progress'
  }

  // ===== RENDER =====

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading pre-alert...</div>
      </div>
    )
  }

  if (error || !preAlert) {
    return (
      <div className="p-8">
        <Alert type="error" message={error || 'Pre-alert not found'} />
        <Button onClick={() => navigate('/pre-alerts')} className="mt-4">
          Back to List
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {preAlert.alert_number}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {preAlert.company_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            label={preAlert.status.replace(/_/g, ' ').toUpperCase()}
            color={
              preAlert.status === 'completed'
                ? 'green'
                : preAlert.status === 'ready'
                ? 'green'
                : preAlert.status === 'in_progress'
                ? 'amber'
                : 'blue'
            }
          />
          <button className="p-2 text-gray-500 hover:text-gray-700">⋯</button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Route</p>
          <p className="text-sm font-medium mt-2 text-gray-900">
            {preAlert.origin_port} → {preAlert.destination_port}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Service</p>
          <p className="text-sm font-medium mt-2 text-gray-900">
            {preAlert.service_type.replace(/_/g, ' ').toUpperCase()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Incoterm</p>
          <p className="text-sm font-medium mt-2 text-gray-900">
            {preAlert.incoterm || '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Quote</p>
          <p className="text-sm font-medium mt-2 text-blue-600 cursor-pointer hover:underline">
            {preAlert.quote_number}
          </p>
        </div>
      </div>

      {/* Completion Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Completion Status</h2>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase">Progress</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {completionStats.percentage}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {completionStats.completed}/{completionStats.total} items
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Critical Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {criticalStatus.critical_done}/{criticalStatus.critical}
            </p>
            <p className="text-sm text-gray-600 mt-1">Must be completed</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <div className="mt-2">
              {canMarkReady() ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setStatusAction('ready')
                    setShowStatusModal(true)
                  }}
                >
                  Mark Ready
                </Button>
              ) : canStartProgress() ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusAction('in_progress')
                    setShowStatusModal(true)
                  }}
                >
                  Start Progress
                </Button>
              ) : canComplete() ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusAction('completed')
                    setShowStatusModal(true)
                  }}
                >
                  Mark Complete
                </Button>
              ) : (
                <span className="text-sm text-gray-600">
                  Status: {preAlert.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition ${
              completionStats.percentage === 100
                ? 'bg-green-500'
                : completionStats.percentage >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${completionStats.percentage}%` }}
          />
        </div>

        {/* Critical Items Alert */}
        {!criticalStatus.can_ready && preAlert.status === 'draft' && (
          <Alert
            type="warning"
            message={`${criticalStatus.critical - criticalStatus.critical_done} critical items remaining. Complete them to mark as ready.`}
            className="mt-4"
          />
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Checklist</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddItemModal(true)}
          >
            + Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {checklistItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No checklist items</p>
          ) : (
            checklistItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getCategoryIcon(item.category)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.item_number}. {item.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          {item.category} •{' '}
                          {item.is_required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                    </div>

                    {/* Status & Notes */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getItemStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>

                      {item.completed_at && (
                        <span className="text-xs text-gray-500">
                          ✓ {new Date(item.completed_at).toLocaleDateString()}
                        </span>
                      )}

                      {item.notes && (
                        <span className="text-xs text-gray-600 italic">
                          "{item.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {item.status === 'pending' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleCompleteItem(
                              item.id,
                              itemNotes[item.id] || ''
                            )
                          }
                        >
                          ✓
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startChecklistItem(item.id)}
                        >
                          ⊙
                        </Button>
                      </>
                    )}

                    {item.status === 'in_progress' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleCompleteItem(item.id, itemNotes[item.id] || '')
                        }
                      >
                        ✓ Complete
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      🗑
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">History</h2>

        <div className="space-y-4">
          {auditTrail.length === 0 ? (
            <p className="text-gray-500 text-sm">No history</p>
          ) : (
            auditTrail.map((event, idx) => (
              <div
                key={event.id}
                className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">
                    {event.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.actor_email || 'System'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(event.acted_at).toLocaleString()}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Add Checklist Item"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <input
              type="text"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="e.g., Obtain shipper's certificate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Category
            </label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="documentation">Documentation</option>
              <option value="customs">Customs</option>
              <option value="carrier">Carrier</option>
              <option value="shipping">Shipping</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddItemModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddItem}>
              Add Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false)
          setStatusAction(null)
        }}
        title="Change Status"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to mark this pre-alert as{' '}
            <strong>{statusAction}</strong>?
          </p>

          {statusAction === 'ready' && criticalStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                ✓ All {criticalStatus.critical} critical items are complete.
                Pre-alert will be locked and ready for job creation.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowStatusModal(false)
                setStatusAction(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStatusChange}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
