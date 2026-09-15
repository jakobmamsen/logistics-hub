/**
 * JobDetailPage.jsx
 * Phase 3 Week 4: Job Detail & Task Management
 * 
 * Features:
 *   - View job info (status, route, service, template)
 *   - Manage tasks (assign, start, complete, block)
 *   - Real-time progress tracking
 *   - Task dependency visualization
 *   - Status transitions (draft → ready → in_progress → completed)
 *   - Audit trail
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Badge, Modal, Notification, Alert } from '../components'
import { useJob } from '../hooks/useJobs'

export default function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const {
    job,
    tasks,
    taskStatusSummary,
    auditTrail,
    isLoading,
    error,
    assignTask,
    startTask,
    completeTask,
    blockTask,
    unblockTask,
    updateTaskNotes,
    markReady,
    markInProgress,
    putOnHold,
    markCompleted,
  } = useJob(jobId)

  const [notification, setNotification] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusAction, setStatusAction] = useState(null)
  const [taskNotes, setTaskNotes] = useState({})

  // ===== HANDLERS =====

  const handleCompleteTask = async (taskId, notes = '') => {
    const { error: err } = await completeTask(taskId, notes)
    if (err) {
      setNotification({ type: 'error', message: `Error: ${err}` })
    } else {
      setNotification({ type: 'success', message: 'Task marked complete' })
    }
  }

  const handleAssignTask = async () => {
    if (!selectedAssignee) {
      setNotification({ type: 'error', message: 'Please select assignee' })
      return
    }

    const { error: err } = await assignTask(selectedTask.id, selectedAssignee)
    if (err) {
      setNotification({ type: 'error', message: `Error: ${err}` })
    } else {
      setNotification({ type: 'success', message: 'Task assigned' })
      setShowAssignModal(false)
      setSelectedTask(null)
      setSelectedAssignee('')
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
      case 'on_hold':
        result = await putOnHold()
        break
      case 'completed':
        result = await markCompleted()
        break
      default:
        return
    }

    if (result.error) {
      setNotification({ type: 'error', message: `Error: ${result.error}` })
    } else {
      setNotification({
        type: 'success',
        message: `Job status updated to ${statusAction}`,
      })
      setShowStatusModal(false)
      setStatusAction(null)
    }
  }

  // ===== RENDER HELPERS =====

  const getTaskStatusBadge = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      blocked: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const canStartProgress = () => job?.status === 'draft' || job?.status === 'ready'
  const canComplete = () => job?.status === 'in_progress'
  const canHold = () => job?.status === 'in_progress'

  // ===== RENDER =====

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading job...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <Alert type="error" message={error || 'Job not found'} />
        <Button onClick={() => navigate('/jobs')} className="mt-4">
          Back to Jobs
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
            {job.job_number}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {job.company_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            label={job.status.replace(/_/g, ' ').toUpperCase()}
            color={
              job.status === 'completed'
                ? 'green'
                : job.status === 'in_progress'
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
            {job.origin_port} → {job.destination_port}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Service</p>
          <p className="text-sm font-medium mt-2 text-gray-900">
            {job.service_type.replace(/_/g, ' ').toUpperCase()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Template</p>
          <p className="text-sm font-medium mt-2 text-gray-900">
            {job.template_name}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Pre-Alert</p>
          <p className="text-sm font-medium mt-2 text-blue-600 cursor-pointer hover:underline">
            {job.alert_number}
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Job Progress</h2>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase">Overall</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {job.progress_percentage}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {taskStatusSummary.completed}/{taskStatusSummary.total} tasks
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {taskStatusSummary.pending || 0}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">In Progress</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {taskStatusSummary.in_progress || 0}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Blocked</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {taskStatusSummary.blocked || 0}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition ${
              job.progress_percentage === 100
                ? 'bg-green-500'
                : job.progress_percentage >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${job.progress_percentage}%` }}
          />
        </div>

        {/* Status Actions */}
        <div className="flex gap-2 flex-wrap">
          {canStartProgress() && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setStatusAction('in_progress')
                setShowStatusModal(true)
              }}
            >
              Start Job
            </Button>
          )}
          {canHold() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusAction('on_hold')
                setShowStatusModal(true)
              }}
            >
              On Hold
            </Button>
          )}
          {canComplete() && (
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
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Tasks</h2>

        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {task.task_number}. {task.task_name}
                      </span>
                      {task.is_critical && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Critical
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {task.description}
                    </p>

                    {/* Status & Assignment */}
                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTaskStatusBadge(
                          task.status
                        )}`}
                      >
                        {task.status.replace(/_/g, ' ')}
                      </span>

                      {task.assigned_to && (
                        <span className="text-xs text-gray-600">
                          ↳ {task.assigned_to.email}
                        </span>
                      )}

                      {task.estimated_duration_hours && (
                        <span className="text-xs text-gray-500">
                          Est. {task.estimated_duration_hours}h
                        </span>
                      )}

                      {task.actual_duration_hours && (
                        <span className="text-xs text-green-600">
                          Actual: {task.actual_duration_hours.toFixed(1)}h
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-gray-600 italic mt-2">
                        "{task.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {task.status === 'pending' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task)
                            setShowAssignModal(true)
                          }}
                        >
                          👤
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startTask(task.id)}
                        >
                          ⊙
                        </Button>
                      </>
                    )}

                    {task.status === 'assigned' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startTask(task.id)}
                      >
                        Start
                      </Button>
                    )}

                    {task.status === 'in_progress' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          ✓
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => blockTask(task.id, 'Waiting on external resource')}
                        >
                          ⊘
                        </Button>
                      </>
                    )}

                    {task.status === 'blocked' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => unblockTask(task.id)}
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Activity History</h2>

        {auditTrail.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity</p>
        ) : (
          <div className="space-y-4">
            {auditTrail.map((event) => (
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
            ))}
          </div>
        )}
      </div>

      {/* Modals */}

      {/* Assign Task Modal */}
      {showAssignModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Task
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedTask.task_name}
                </p>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select team member...</option>
                  <option value="user-1">Jakob Larsen</option>
                  <option value="user-2">Maria Gonzalez</option>
                  <option value="user-3">Ahmed Hassan</option>
                  <option value="user-4">Li Wei</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedTask(null)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAssignTask}>
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Change Status
            </h2>

            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to mark this job as{' '}
                <strong>{statusAction}</strong>?
              </p>

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
          </div>
        </div>
      )}
    </div>
  )
}
