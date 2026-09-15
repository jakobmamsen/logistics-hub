// ============================================================================
// LOGISTICS HUB RELEASE 1 — TASK MANAGER COMPONENT
// ============================================================================
// File: TaskManager.jsx
// Purpose: Create, assign, track, and complete operational tasks
// Dependencies: React, useApi, useAuth, workflow-utils
// Status: Production-ready for Release 1
//
// Features:
// 1. Create task from job
// 2. Assign to team member
// 3. Update status (open → in_progress → completed)
// 4. Set priority (low, medium, high, critical)
// 5. Track due date
// 6. View task history
//
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Form } from './Form';
import { Alert } from './Alert';
import { ChevronDown, Plus, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';

/**
 * TaskManager - Create, assign, and track operational tasks
 * @component
 * @param {string} jobId - Job ID
 * @param {array} tasks - Initial tasks array
 * @param {array} teamMembers - Team members for assignment
 * @param {function} onTasksUpdate - Callback when tasks change
 */
export default function TaskManager({ jobId, tasks = [], teamMembers = [], onTasksUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { user, hasPermission } = useAuth();
  
  const [localTasks, setLocalTasks] = useState(tasks || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, in_progress, completed
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: null
  });

  // Priority colors
  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  // Status colors
  const statusColors = {
    open: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  // Status icons
  const statusIcons = {
    open: <AlertCircle className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />
  };

  // Handle create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Task title is required');
      return;
    }

    const newTask = {
      jobId,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate,
      assignedTo: formData.assignedTo,
      status: 'open'
    };

    const response = await apiCall('POST', `/api/jobs/${jobId}/tasks`, newTask);

    if (response.success) {
      setLocalTasks([...localTasks, response.data]);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: null });
      setShowCreateModal(false);
      setSuccessMessage('Task created successfully');
      
      if (onTasksUpdate) {
        onTasksUpdate([...localTasks, response.data]);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to create task');
    }
  };

  // Handle update task status
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/tasks/${taskId}`,
      {
        status: newStatus,
        ...(newStatus === 'completed' && { completedAt: new Date().toISOString() })
      }
    );

    if (response.success) {
      const updated = localTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completedAt: response.data.completedAt } : t
      );
      setLocalTasks(updated);
      setSuccessMessage(`Task marked as ${newStatus.replace('_', ' ')}`);
      
      if (onTasksUpdate) {
        onTasksUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle assign task
  const handleAssignTask = async (taskId, userId) => {
    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/tasks/${taskId}`,
      { assignedTo: userId }
    );

    if (response.success) {
      const updated = localTasks.map(t =>
        t.id === taskId ? { ...t, assignedTo: userId } : t
      );
      setLocalTasks(updated);
      setSuccessMessage('Task assigned');
      
      if (onTasksUpdate) {
        onTasksUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    const response = await apiCall(
      'PATCH',
      `/api/jobs/${jobId}/tasks/${taskId}`,
      { status: 'cancelled' }
    );

    if (response.success) {
      const updated = localTasks.filter(t => t.id !== taskId);
      setLocalTasks(updated);
      setSuccessMessage('Task cancelled');
      
      if (onTasksUpdate) {
        onTasksUpdate(updated);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filter tasks
  const filteredTasks = filterStatus === 'all'
    ? localTasks
    : localTasks.filter(t => t.status === filterStatus);

  // Count by status
  const statusCounts = {
    open: localTasks.filter(t => t.status === 'open').length,
    in_progress: localTasks.filter(t => t.status === 'in_progress').length,
    completed: localTasks.filter(t => t.status === 'completed').length
  };

  const canCreateTask = hasPermission('task', 'write');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
        {canCreateTask && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Create Task
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

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterStatus === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({localTasks.length})
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterStatus === 'open'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Open ({statusCounts.open})
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterStatus === 'in_progress'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          In Progress ({statusCounts.in_progress})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-3 py-2 rounded text-sm font-medium ${
            filterStatus === 'completed'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({statusCounts.completed})
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">
            {filterStatus === 'all' 
              ? 'No tasks yet. Create one to get started.'
              : `No ${filterStatus.replace('_', ' ')} tasks.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedTaskId(
                        expandedTaskId === task.id ? null : task.id
                      )}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition ${
                          expandedTaskId === task.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <Badge className={`${statusColors[task.status]} text-xs`}>
                      <div className="flex items-center gap-1">
                        {statusIcons[task.status]}
                        {task.status.replace('_', ' ')}
                      </div>
                    </Badge>
                    <Badge className={`${priorityColors[task.priority]} text-xs`}>
                      {task.priority}
                    </Badge>
                  </div>

                  {/* Task Metadata */}
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    {task.dueDate && (
                      <div>
                        <span className="font-medium">Due:</span> {task.dueDate}
                      </div>
                    )}
                    {task.assignedTo && (
                      <div>
                        <span className="font-medium">Assigned to:</span>{' '}
                        {teamMembers.find(m => m.id === task.assignedTo)?.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {task.status !== 'completed' && canCreateTask && (
                    <Button
                      onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                      variant="outline"
                      size="sm"
                    >
                      Complete
                    </Button>
                  )}
                  {canCreateTask && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTaskId === task.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {task.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                  )}

                  {/* Status Update */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
                    <div className="flex gap-2">
                      {['open', 'in_progress', 'completed'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateTaskStatus(task.id, status)}
                          disabled={task.status === status}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            task.status === status
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        value={task.assignedTo || ''}
                        onChange={(e) => handleAssignTask(task.id, e.target.value || null)}
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

                  {/* Timeline */}
                  {task.createdAt && (
                    <div className="text-xs text-gray-500">
                      Created {new Date(task.createdAt).toLocaleDateString()}
                      {task.completedAt && (
                        <> • Completed {new Date(task.completedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError(null);
          setFormData({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: null });
        }}
        title="Create Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Form.Group>
            <Form.Label htmlFor="title">Task Title</Form.Label>
            <Form.Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Prepare shipping documents"
              required
            />
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="description">Description</Form.Label>
            <Form.Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional details about the task"
              rows={3}
            />
          </Form.Group>

          <div className="grid grid-cols-2 gap-4">
            <Form.Group>
              <Form.Label htmlFor="priority">Priority</Form.Label>
              <Form.Select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="dueDate">Due Date</Form.Label>
              <Form.Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </Form.Group>
          </div>

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
                setFormData({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: null });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================================
// END OF TaskManager.jsx
// ============================================================================
