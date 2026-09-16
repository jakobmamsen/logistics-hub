import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import Table from './Table';
import Card from './Card';
import Button from './Button';
import { AlertCircle, Plus } from 'lucide-react';

export default function PreAlertManager() {
  const { request } = useApi();
  const [preAlerts, setPreAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchPreAlerts = async () => {
      try {
        const response = await request('/api/pre-alerts');
        if (response.success) {
          setPreAlerts(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load pre-alerts:', err);
      }
    };
    fetchPreAlerts();
  }, [request]);

  const filteredAlerts = filter === 'all' 
    ? preAlerts 
    : preAlerts.filter(a => a.status === filter);

  return (
    <DashboardLayout pageTitle="Pre-Alerts">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Pre-Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{preAlerts.length}</p>
              </div>
              <AlertCircle size={24} className="text-orange-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{preAlerts.filter(a => a.status === 'pending').length}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-3xl font-bold text-green-600">{preAlerts.filter(a => a.status === 'received').length}</p>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {['all', 'pending', 'received', 'cleared'].map(status => (
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
          <Button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> New Pre-Alert
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Alert #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vessel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Port</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ETA</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">PA-{idx + 1001}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.vessel_name || 'MSC GÜLSÜM'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.port || 'Hamburg'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{alert.eta || '2026-09-20'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'received' ? 'bg-green-100 text-green-800' :
                      alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(alert.status || 'pending').charAt(0).toUpperCase() + (alert.status || 'pending').slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No pre-alerts found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
