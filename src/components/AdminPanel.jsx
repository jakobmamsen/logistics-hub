// ============================================================================
// LOGISTICS HUB RELEASE 1 — ADMIN PANEL COMPONENT
// ============================================================================
// File: AdminPanel.jsx
// Purpose: User management, role assignment, team administration
// Dependencies: React, useApi, useAuth
// Status: Production-ready for Release 1
//
// Features:
// 1. User management (create, edit, deactivate)
// 2. Role assignment per user per team
// 3. Team management
// 4. Permission overview
//
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import Badge from './Badge';
import Modal from './Modal';
import Form from './Form';
import Alert from './Alert';
import { Users, Plus, Edit2, Trash2, CheckCircle, Circle, ChevronDown, Shield } from 'lucide-react';

/**
 * AdminPanel - User and role management
 * @component
 * @param {array} users - Initial users array
 * @param {array} roles - Available roles
 * @param {array} teams - Available teams
 * @param {function} onDataUpdate - Callback when data changes
 */
export default function AdminPanel({ users = [], roles = [], teams = [], onDataUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { user: currentUser, hasPermission } = useAuth();
  
  const [localUsers, setLocalUsers] = useState(users || []);
  const [localTeams, setLocalTeams] = useState(teams || []);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // User form state
  const [userFormData, setUserFormData] = useState({
    email: '',
    name: '',
    status: 'active'
  });

  // Role form state
  const [roleFormData, setRoleFormData] = useState({
    userId: null,
    teamId: null,
    roleId: null
  });

  // Role color mapping
  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-purple-100 text-purple-800',
    commercial: 'bg-blue-100 text-blue-800',
    finance: 'bg-green-100 text-green-800',
    operations: 'bg-orange-100 text-orange-800'
  };

  // Handle create/edit user
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!userFormData.email || !userFormData.name) {
      setFormError('Email and name are required');
      return;
    }

    const isEdit = selectedUser !== null;
    const response = await apiCall(
      isEdit ? 'PATCH' : 'POST',
      isEdit ? `/api/admin/users/${selectedUser.id}` : '/api/admin/users',
      userFormData
    );

    if (response.success) {
      if (isEdit) {
        const updated = localUsers.map(u => u.id === selectedUser.id ? response.data : u);
        setLocalUsers(updated);
      } else {
        setLocalUsers([...localUsers, response.data]);
      }

      setShowUserModal(false);
      setUserFormData({ email: '', name: '', status: 'active' });
      setSelectedUser(null);
      setSuccessMessage(isEdit ? 'User updated successfully' : 'User created successfully');

      if (onDataUpdate) onDataUpdate({ users: localUsers });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to save user');
    }
  };

  // Handle assign role
  const handleAssignRole = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!roleFormData.userId || !roleFormData.teamId || !roleFormData.roleId) {
      setFormError('User, team, and role are required');
      return;
    }

    const response = await apiCall(
      'POST',
      '/api/admin/role-assignments',
      roleFormData
    );

    if (response.success) {
      const updated = localUsers.map(u => {
        if (u.id === roleFormData.userId) {
          return {
            ...u,
            roleAssignments: [...(u.roleAssignments || []), response.data]
          };
        }
        return u;
      });
      setLocalUsers(updated);
      setShowRoleModal(false);
      setRoleFormData({ userId: null, teamId: null, roleId: null });
      setSuccessMessage('Role assigned successfully');

      if (onDataUpdate) onDataUpdate({ users: updated });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to assign role');
    }
  };

  // Handle revoke role
  const handleRevokeRole = async (userId, assignmentId) => {
    if (!window.confirm('Are you sure you want to revoke this role?')) return;

    const response = await apiCall(
      'DELETE',
      `/api/admin/role-assignments/${assignmentId}`
    );

    if (response.success) {
      const updated = localUsers.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            roleAssignments: (u.roleAssignments || []).filter(a => a.id !== assignmentId)
          };
        }
        return u;
      });
      setLocalUsers(updated);
      setSuccessMessage('Role revoked');

      if (onDataUpdate) onDataUpdate({ users: updated });
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle deactivate user
  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user? They will lose access immediately.')) return;

    const response = await apiCall(
      'PATCH',
      `/api/admin/users/${userId}`,
      { status: 'inactive' }
    );

    if (response.success) {
      const updated = localUsers.map(u => u.id === userId ? { ...u, status: 'inactive' } : u);
      setLocalUsers(updated);
      setSuccessMessage('User deactivated');

      if (onDataUpdate) onDataUpdate({ users: updated });
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filter users
  const filteredUsers = localUsers.filter(u => {
    if (filterTeam !== 'all') {
      const hasTeam = (u.roleAssignments || []).some(ra => ra.teamId === filterTeam);
      if (!hasTeam) return false;
    }
    if (filterRole !== 'all') {
      const hasRole = (u.roleAssignments || []).some(ra => ra.roleId === filterRole);
      if (!hasRole) return false;
    }
    return true;
  });

  const canManageUsers = hasPermission('user', 'manage');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h2>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        {canManageUsers && (
          <Button
            onClick={() => {
              setSelectedUser(null);
              setUserFormData({ email: '', name: '', status: 'active' });
              setShowUserModal(true);
            }}
            variant="primary"
            icon={Plus}
          >
            Add User
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert type="success">{successMessage}</Alert>
      )}
      {error && (
        <Alert type="error">{error}</Alert>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Team</label>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Teams</option>
              {localTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <div key={user.id} className="hover:bg-gray-50 transition">
                {/* User Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedUserId(
                          expandedUserId === user.id ? null : user.id
                        )}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition ${
                            expandedUserId === user.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Badge className={user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                      }>
                        {user.status}
                      </Badge>
                    </div>

                    {/* Role Badges */}
                    {(user.roleAssignments || []).length > 0 && (
                      <div className="mt-2 ml-8 flex flex-wrap gap-2">
                        {user.roleAssignments.map(ra => (
                          <Badge
                            key={ra.id}
                            className={`${roleColors[ra.role?.name.toLowerCase()] || 'bg-gray-100 text-gray-800'} text-xs`}
                          >
                            {ra.role?.name} ({localTeams.find(t => t.id === ra.teamId)?.name || 'Unknown'})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canManageUsers && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setUserFormData({
                            email: user.email,
                            name: user.name,
                            status: user.status
                          });
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.status === 'active' && (
                        <button
                          onClick={() => handleDeactivateUser(user.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Deactivate user"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Role Assignment */}
                {expandedUserId === user.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    {/* Current Roles */}
                    {(user.roleAssignments || []).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Current Roles</p>
                        <div className="space-y-2">
                          {user.roleAssignments.map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {assignment.role?.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {localTeams.find(t => t.id === assignment.teamId)?.name}
                                </p>
                              </div>
                              {canManageUsers && user.status === 'active' && (
                                <button
                                  onClick={() => handleRevokeRole(user.id, assignment.id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assign Role Button */}
                    {canManageUsers && user.status === 'active' && (
                      <Button
                        onClick={() => {
                          setRoleFormData({ userId: user.id, teamId: null, roleId: null });
                          setShowRoleModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        icon={Plus}
                      >
                        Assign Role
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setFormError(null);
          setUserFormData({ email: '', name: '', status: 'active' });
          setSelectedUser(null);
        }}
        title={selectedUser ? 'Edit User' : 'Add User'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Form.Group>
            <Form.Label htmlFor="email">Email</Form.Label>
            <Form.Input
              id="email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              placeholder="user@example.com"
              required
              disabled={selectedUser !== null}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="name">Name</Form.Label>
            <Form.Input
              id="name"
              type="text"
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              placeholder="Full name"
              required
            />
          </Form.Group>

          {selectedUser && (
            <Form.Group>
              <Form.Label htmlFor="status">Status</Form.Label>
              <Form.Select
                id="status"
                value={userFormData.status}
                onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUserModal(false);
                setFormError(null);
                setUserFormData({ email: '', name: '', status: 'active' });
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setFormError(null);
          setRoleFormData({ userId: null, teamId: null, roleId: null });
        }}
        title="Assign Role"
      >
        <form onSubmit={handleAssignRole} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Form.Group>
            <Form.Label>User</Form.Label>
            <p className="text-sm font-medium text-gray-700">
              {localUsers.find(u => u.id === roleFormData.userId)?.name}
            </p>
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="teamId">Team</Form.Label>
            <Form.Select
              id="teamId"
              value={roleFormData.teamId || ''}
              onChange={(e) => setRoleFormData({ ...roleFormData, teamId: e.target.value || null })}
              required
            >
              <option value="">Select team</option>
              {localTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label htmlFor="roleId">Role</Form.Label>
            <Form.Select
              id="roleId"
              value={roleFormData.roleId || ''}
              onChange={(e) => setRoleFormData({ ...roleFormData, roleId: e.target.value || null })}
              required
            >
              <option value="">Select role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRoleModal(false);
                setFormError(null);
                setRoleFormData({ userId: null, teamId: null, roleId: null });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================================
// END OF AdminPanel.jsx
// ============================================================================
