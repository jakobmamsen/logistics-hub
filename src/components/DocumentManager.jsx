import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Table from './Table';
import Button from './Button';
import Card from './Card';
import { Upload, Download, Trash2, FileText } from 'lucide-react';

export default function DocumentManager() {
  const [documents] = useState([
    { id: 1, name: 'Packing List - JOB-001.pdf', type: 'Packing List', uploadedAt: '2026-09-15', size: '2.4 MB' },
    { id: 2, name: 'Bill of Lading - JOB-001.pdf', type: 'Bill of Lading', uploadedAt: '2026-09-14', size: '1.8 MB' },
    { id: 3, name: 'Invoice - QT-002.pdf', type: 'Invoice', uploadedAt: '2026-09-13', size: '892 KB' },
  ]);

  return (
    <DashboardLayout pageTitle="Documents">
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Document Library</h2>
            <p className="text-sm text-gray-600 mt-1">{documents.length} files uploaded</p>
          </div>
          <Button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Upload size={18} /> Upload
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{documents.length}</p>
              </div>
              <FileText size={24} className="text-blue-600" />
            </div>
          </Card>
          <Card className="p-6">
            <div>
              <p className="text-sm text-gray-600">Total Size</p>
              <p className="text-3xl font-bold text-gray-900">5.1 MB</p>
            </div>
          </Card>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{doc.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.type}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.uploadedAt}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{doc.size}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-blue-50 rounded-lg"><Download size={16} className="text-blue-600" /></button>
                      <button className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-600" /></button>
                    </div>
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
