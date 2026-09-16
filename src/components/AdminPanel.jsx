import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import Button from './Button';
import { Users, Settings, Activity, Shield } from 'lucide-react';

export default function AdminPanel() {
  const [users] = useState([
    { id: 1, name: 'Søren Abildgaard', email: 'soren@glanorway.no', role: 'Admin', status: 'active' },
    { id: 2, name: 'John Doe', email: 'john@glanorway.no', role: 'Manager', status: 'active' },
    { id: 3, name: 'Jane Smith', email: 'jane@glanorway.no', role: 'Commercial', status: 'active' },
  ]);

  const [tab, setTab] = useState('users');

  return (
    <DashboardLayout pageTitle="Admin Panel">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">3</p>
              </div>
              <Activity size={24} className="text-green-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Calls (24h)</p>
                <p className="text-3xl font-bold text-gray-900">842</p>
              </div>
              <Shield size={24} className="text-purple-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-3xl font-bold text-green-600">98%</p>
              </div>
              <Settings size={24} className="text-orange-600" />
            </div>
          </Card>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {['users', 'settings', 'logs'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.role}</td>
                    <td className="px-6 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button className="text-blue-600 text-sm font-medium hover:underline">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {tab === 'settings' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Settings</h3>
            <p className="text-gray-600">Settings configuration coming soon...</p>
          </Card>
        )}

        {tab === 'logs' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Logs</h3>
            <p className="text-gray-600">Audit logs coming soon...</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
