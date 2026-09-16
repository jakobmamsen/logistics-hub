import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { CheckCircle2 } from 'lucide-react';

export default function TaskManager() {
  const [tasks] = useState([
    { id: 1, title: 'Review quote QT-001', dueDate: '2026-09-20', status: 'open', priority: 'high' },
    { id: 2, title: 'Follow up with client', dueDate: '2026-09-22', status: 'open', priority: 'medium' },
    { id: 3, title: 'Prepare shipping docs', dueDate: '2026-09-25', status: 'open', priority: 'high' },
  ]);

  const [filter, setFilter] = useState('open');
  const filteredTasks = tasks.filter(t => t.status === filter || filter === 'all');

  return (
    <DashboardLayout pageTitle="Tasks">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'open').length}</p>
              </div>
              <CheckCircle2 size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-red-600">{tasks.filter(t => t.priority === 'high').length}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-orange-600">0</p>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          {['open', 'completed', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{task.dueDate}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{task.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
