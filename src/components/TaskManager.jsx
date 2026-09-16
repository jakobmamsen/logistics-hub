import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Card from './Card';
import { useApi } from '../hooks/useApi';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const DASH = '\u2014';
const STATUSES = ['all', 'open', 'in_progress', 'completed', 'cancelled'];

export default function TaskManager() {
  const navigate = useNavigate();
  const { request } = useApi();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ overdue: 0, dueSoon: 0, authenticated: false });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let off = false;
    request('/tasks-api')
      .then((p) => {
        if (off) return;
        setTasks(p.data || []);
        setStats({
          overdue: p.overdue || 0,
          dueSoon: p.dueSoon || 0,
          authenticated: !!p.authenticated,
        });
      })
      .catch((e) => { if (!off) setError(e.message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [request]);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const label = (s) => (s || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const prioClass = (p) =>
    p === 'critical' ? 'bg-red-100 text-red-800'
    : p === 'high' ? 'bg-orange-100 text-orange-800'
    : p === 'medium' ? 'bg-yellow-100 text-yellow-800'
    : 'bg-green-100 text-green-800';

  const statusClass = (s) =>
    s === 'completed' ? 'bg-green-100 text-green-800'
    : s === 'in_progress' ? 'bg-blue-100 text-blue-800'
    : s === 'cancelled' ? 'bg-gray-100 text-gray-600'
    : 'bg-amber-100 text-amber-800';

  return (
    <DashboardLayout pageTitle="Tasks">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn't load tasks: {error}
          </div>
        )}

        {!loading && !error && !stats.authenticated && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Warning: request was not authenticated - no session token reached the server.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Open Tasks</p>
            <p className="text-3xl font-bold text-gray-900">
              {tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length}
            </p></div>
            <CheckCircle2 size={24} className="text-blue-600" /></div></Card>

          <Card className="p-6"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Due Soon</p>
            <p className="text-3xl font-bold text-amber-600">{stats.dueSoon}</p>
            <p className="text-xs text-gray-500 mt-1">next 3 days</p></div>
            <Clock size={24} className="text-amber-600" /></div></Card>

          <Card className="p-6"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Overdue</p>
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p></div>
            <AlertTriangle size={24} className="text-red-600" /></div></Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === s ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}`}>
              {label(s)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Job</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assignee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading tasks...</td></tr>}

              {!loading && filtered.map((task) => (
                <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500">{task.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {task.job_reference ? (
                      <span className="text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/jobs/${task.job_id}`)}>
                        {task.job_reference}
                      </span>
                    ) : DASH}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{task.assignee_name || 'Unassigned'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${prioClass(task.priority)}`}>
                      {label(task.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm whitespace-nowrap">
                    {task.due_date ? (
                      <span className={task.is_overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {new Date(task.due_date).toLocaleDateString('en-GB')}
                        {task.is_overdue && <span className="block text-xs">overdue</span>}
                      </span>
                    ) : DASH}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(task.status)}`}>
                      {label(task.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No tasks found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
