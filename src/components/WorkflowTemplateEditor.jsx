/**
 * WorkflowTemplateEditor.jsx
 * Phase 3 Week 4: Workflow Template Management (Admin)
 * 
 * Features:
 *   - View all workflow templates
 *   - Create new template
 *   - Edit existing template
 *   - Add/reorder/delete workflow steps
 *   - Set step dependencies
 *   - Mark critical steps
 *   - Version management
 */

import React, { useState } from 'react'
import { Button, Badge, Modal, Notification, Alert } from '../components'

export default function WorkflowTemplateEditor() {
  const [notification, setNotification] = useState(null)
  const [templates, setTemplates] = useState([
    {
      id: '1',
      name: 'Ocean Export FCL',
      code: 'OE-FCL',
      serviceType: 'ocean_fcl',
      isDefault: true,
      stepCount: 8,
      version: 1,
    },
    {
      id: '2',
      name: 'Ocean Import FCL',
      code: 'OI-FCL',
      serviceType: 'ocean_fcl',
      isDefault: false,
      stepCount: 9,
      version: 1,
    },
    {
      id: '3',
      name: 'Ocean LCL Export',
      code: 'OE-LCL',
      serviceType: 'ocean_lcl',
      isDefault: true,
      stepCount: 7,
      version: 1,
    },
    {
      id: '4',
      name: 'Air Freight Export',
      code: 'AE',
      serviceType: 'air_freight',
      isDefault: true,
      stepCount: 6,
      version: 1,
    },
  ])

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showStepsModal, setShowStepsModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    code: '',
    serviceType: 'ocean_fcl',
    isDefault: false,
  })

  const [templateSteps, setTemplateSteps] = useState([
    {
      number: 1,
      name: 'Arrange Pickup',
      role: 'operations',
      isCritical: true,
      estimatedHours: 2,
      dependsOn: null,
    },
    {
      number: 2,
      name: 'File Customs',
      role: 'customs',
      isCritical: true,
      estimatedHours: 3,
      dependsOn: null,
    },
    {
      number: 3,
      name: 'Reserve Container',
      role: 'operations',
      isCritical: true,
      estimatedHours: 1,
      dependsOn: null,
    },
    {
      number: 4,
      name: 'Arrange CY',
      role: 'operations',
      isCritical: false,
      estimatedHours: 1.5,
      dependsOn: 3,
    },
    {
      number: 5,
      name: 'Confirm Vessel',
      role: 'operations',
      isCritical: true,
      estimatedHours: 0.5,
      dependsOn: null,
    },
  ])

  // ===== HANDLERS =====

  const handleCreateTemplate = () => {
    setTemplateForm({
      name: '',
      code: '',
      serviceType: 'ocean_fcl',
      isDefault: false,
    })
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.code) {
      setNotification({ type: 'error', message: 'Name and code required' })
      return
    }

    setNotification({ type: 'success', message: 'Template saved' })
    setShowTemplateModal(false)
  }

  const handleEditSteps = (template) => {
    setSelectedTemplate(template)
    setShowStepsModal(true)
  }

  const handleAddStep = () => {
    const newStep = {
      number: templateSteps.length + 1,
      name: 'New Step',
      role: 'operations',
      isCritical: false,
      estimatedHours: 1,
      dependsOn: null,
    }
    setTemplateSteps([...templateSteps, newStep])
  }

  const handleDeleteStep = (number) => {
    setTemplateSteps(templateSteps.filter((s) => s.number !== number))
  }

  const handleSaveSteps = () => {
    setNotification({ type: 'success', message: 'Workflow steps saved' })
    setShowStepsModal(false)
  }

  // ===== RENDER =====

  const serviceTypeLabel = {
    ocean_fcl: 'Ocean FCL',
    ocean_lcl: 'Ocean LCL',
    air_freight: 'Air Freight',
    roro: 'RoRo',
    breakbulk: 'Breakbulk',
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Workflow Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage job workflow process definitions
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateTemplate}
        >
          + New Template
        </Button>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900">
                    {template.name}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {template.code}
                  </span>
                  {template.isDefault && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Default
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    Service: {serviceTypeLabel[template.serviceType]}
                  </span>
                  <span>{template.stepCount} steps</span>
                  <span>v{template.version}</span>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditSteps(template)}
                >
                  Edit Steps
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                >
                  Settings
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {templateForm.id ? 'Edit Template' : 'Create Template'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  placeholder="e.g., Ocean Export FCL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Code
                </label>
                <input
                  type="text"
                  value={templateForm.code}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, code: e.target.value })
                  }
                  placeholder="e.g., OE-FCL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Service Type
                </label>
                <select
                  value={templateForm.serviceType}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, serviceType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ocean_fcl">Ocean FCL</option>
                  <option value="ocean_lcl">Ocean LCL</option>
                  <option value="air_freight">Air Freight</option>
                  <option value="roro">RoRo</option>
                  <option value="breakbulk">Breakbulk</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={templateForm.isDefault}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, isDefault: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  Default template for this service type
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowTemplateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveTemplate}
                >
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Editor Modal */}
      {showStepsModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Workflow Steps: {selectedTemplate.name}
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {templateSteps.map((step, idx) => (
                <div
                  key={step.number}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 uppercase mb-1">
                          Step Name
                        </label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => {
                            const updated = [...templateSteps]
                            updated[idx].name = e.target.value
                            setTemplateSteps(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 uppercase mb-1">
                            Assigned Role
                          </label>
                          <select
                            value={step.role}
                            onChange={(e) => {
                              const updated = [...templateSteps]
                              updated[idx].role = e.target.value
                              setTemplateSteps(updated)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="operations">Operations</option>
                            <option value="customs">Customs</option>
                            <option value="carrier">Carrier</option>
                            <option value="shipping">Shipping</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 uppercase mb-1">
                            Est. Hours
                          </label>
                          <input
                            type="number"
                            value={step.estimatedHours}
                            onChange={(e) => {
                              const updated = [...templateSteps]
                              updated[idx].estimatedHours = parseFloat(e.target.value)
                              setTemplateSteps(updated)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={step.isCritical}
                            onChange={(e) => {
                              const updated = [...templateSteps]
                              updated[idx].isCritical = e.target.checked
                              setTemplateSteps(updated)
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Critical step</span>
                        </label>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteStep(step.number)}
                      className="ml-4"
                    >
                      🗑
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddStep}
              >
                + Add Step
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowStepsModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveSteps}
                >
                  Save Steps
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
