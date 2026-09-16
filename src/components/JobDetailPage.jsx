import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useApi } from '../hooks/useApi';
import { useParams } from 'react-router-dom';
import Card from './Card';
import { Package, Calendar, DollarSign, Truck } from 'lucide-react';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { request } = useApi();
  const [job, setJob] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await request(`/api/jobs/${jobId}`);
        if (response.success) {
          setJob(response.data);
        }
      } catch (err) {
        console.error('Failed to load job:', err);
      }
    };
    if (jobId) fetchJob();
  }, [jobId, request]);

  if (!job) {
    return (
      <DashboardLayout pageTitle="Job Details">
        <div className="text-center py-12">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={`Job ${job.job_number || 'JOB-001'}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Package size={24} className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Containers</p>
                <p className="text-2xl font-bold text-gray-900">{job.container_count || 2}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Truck size={24} className="text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">{job.status || 'In Transit'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">ETA</p>
                <p className="text-2xl font-bold text-gray-900">{job.eta || '2026-09-28'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign size={24} className="text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-gray-900">${job.total_cost || '0'}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Origin</p>
              <p className="text-base font-medium text-gray-900">{job.origin_port || 'Shanghai'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Destination</p>
              <p className="text-base font-medium text-gray-900">{job.destination_port || 'Hamburg'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Vessel</p>
              <p className="text-base font-medium text-gray-900">{job.vessel_name || 'MSC GÜLSÜM'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Container Type</p>
              <p className="text-base font-medium text-gray-900">{job.container_type || '20ft HC'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-green-600 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Booking Confirmed</p>
                <p className="text-sm text-gray-600">2026-09-15</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-blue-600 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Cargo Loaded</p>
                <p className="text-sm text-gray-600">2026-09-18</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3 h-3 rounded-full bg-gray-400 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Vessel Departure</p>
                <p className="text-sm text-gray-600">2026-09-20</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
