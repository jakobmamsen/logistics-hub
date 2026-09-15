// ============================================================================
// LOGISTICS HUB RELEASE 1 — SYSTEM SETTINGS COMPONENT
// ============================================================================
// File: SystemSettings.jsx
// Purpose: Configure system-wide settings and integrations
// Dependencies: React, useApi, useAuth
// Status: Production-ready for Release 1
//
// Features:
// 1. General settings (company name, timezone)
// 2. TMS integration (URL template, credentials)
// 3. Email configuration (SMTP settings)
// 4. API key management
// 5. Master data management (currencies, carriers)
//
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { Badge } from './Badge';
import { Tabs } from './Tabs';
import { Alert } from './Alert';
import { Eye, EyeOff, Copy, Plus, Trash2, RefreshCw, Settings, Key } from 'lucide-react';

/**
 * SystemSettings - Configure system settings
 * @component
 * @param {object} currentSettings - Current settings
 * @param {function} onSettingsUpdate - Callback when settings change
 */
export default function SystemSettings({ currentSettings = {}, onSettingsUpdate }) {
  const { apiCall, loading, error } = useApi();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(currentSettings);
  const [showApiKey, setShowApiKey] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  // General settings form
  const [generalForm, setGeneralForm] = useState({
    companyName: settings.companyName || '',
    companyCode: settings.companyCode || '',
    defaultTimezone: settings.defaultTimezone || 'UTC',
    defaultCurrency: settings.defaultCurrency || 'EUR'
  });

  // TMS settings form
  const [tmsForm, setTmsForm] = useState({
    tmsType: settings.tmsType || 'none',
    tmsUrl: settings.tmsUrl || '',
    tmsApiKey: '',
    tmsUsername: settings.tmsUsername || '',
    autoSync: settings.autoSync || false
  });

  // Email settings form
  const [emailForm, setEmailForm] = useState({
    smtpHost: settings.smtpHost || '',
    smtpPort: settings.smtpPort || 587,
    smtpUser: settings.smtpUser || '',
    smtpPassword: '',
    fromEmail: settings.fromEmail || '',
    fromName: settings.fromName || ''
  });

  // API Keys
  const [apiKeys, setApiKeys] = useState(settings.apiKeys || []);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  const canManageSettings = hasPermission('settings', 'manage');

  // Handle save general settings
  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setFormError(null);

    const response = await apiCall(
      'PATCH',
      '/api/admin/settings/general',
      generalForm
    );

    if (response.success) {
      setSettings({ ...settings, ...response.data });
      setSuccessMessage('General settings saved');

      if (onSettingsUpdate) onSettingsUpdate({ ...settings, ...response.data });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to save settings');
    }
  };

  // Handle save TMS settings
  const handleSaveTmsSettings = async (e) => {
    e.preventDefault();
    setFormError(null);

    const response = await apiCall(
      'PATCH',
      '/api/admin/settings/tms',
      tmsForm
    );

    if (response.success) {
      setSettings({ ...settings, ...response.data });
      setTmsForm({ ...tmsForm, tmsApiKey: '' });
      setSuccessMessage('TMS settings saved');

      if (onSettingsUpdate) onSettingsUpdate({ ...settings, ...response.data });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to save settings');
    }
  };

  // Handle save email settings
  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setFormError(null);

    const response = await apiCall(
      'PATCH',
      '/api/admin/settings/email',
      emailForm
    );

    if (response.success) {
      setSettings({ ...settings, ...response.data });
      setEmailForm({ ...emailForm, smtpPassword: '' });
      setSuccessMessage('Email settings saved');

      if (onSettingsUpdate) onSettingsUpdate({ ...settings, ...response.data });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to save settings');
    }
  };

  // Handle create API key
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!newKeyName.trim()) {
      setFormError('Key name is required');
      return;
    }

    const response = await apiCall(
      'POST',
      '/api/admin/settings/api-keys',
      { name: newKeyName }
    );

    if (response.success) {
      setApiKeys([...apiKeys, response.data]);
      setNewKeyName('');
      setShowNewKeyModal(false);
      setSuccessMessage('API key created');

      if (onSettingsUpdate) onSettingsUpdate({ ...settings, apiKeys: [...apiKeys, response.data] });
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setFormError(response.error || 'Failed to create API key');
    }
  };

  // Handle revoke API key
  const handleRevokeApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key?')) return;

    const response = await apiCall(
      'DELETE',
      `/api/admin/settings/api-keys/${keyId}`
    );

    if (response.success) {
      const updated = apiKeys.filter(k => k.id !== keyId);
      setApiKeys(updated);
      setSuccessMessage('API key revoked');

      if (onSettingsUpdate) onSettingsUpdate({ ...settings, apiKeys: updated });
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`${label} copied to clipboard`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  if (!canManageSettings) {
    return (
      <Alert type="error">
        You do not have permission to manage system settings.
      </Alert>
    );
  }

  const timezones = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Amsterdam', 'Europe/Oslo',
    'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore',
    'Asia/Shanghai', 'Australia/Sydney'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'JPY', 'CNY', 'SGD'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert type="success">{successMessage}</Alert>
      )}
      {error && (
        <Alert type="error">{error}</Alert>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'tms', label: 'TMS Integration' },
          { id: 'email', label: 'Email Configuration' },
          { id: 'api-keys', label: 'API Keys' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSaveGeneralSettings} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={generalForm.companyName}
                onChange={(e) => setGeneralForm({ ...generalForm, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="GLA Norway AS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Code</label>
              <input
                type="text"
                value={generalForm.companyCode}
                onChange={(e) => setGeneralForm({ ...generalForm, companyCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="GLA-NO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
              <select
                value={generalForm.defaultTimezone}
                onChange={(e) => setGeneralForm({ ...generalForm, defaultTimezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
              <select
                value={generalForm.defaultCurrency}
                onChange={(e) => setGeneralForm({ ...generalForm, defaultCurrency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {currencies.map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TMS Integration Settings */}
      {activeTab === 'tms' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSaveTmsSettings} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TMS Type</label>
              <select
                value={tmsForm.tmsType}
                onChange={(e) => setTmsForm({ ...tmsForm, tmsType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="none">None (Disabled)</option>
                <option value="copilot">Copilot</option>
                <option value="project44">Project 44</option>
                <option value="fourkites">FourKites</option>
                <option value="other">Other</option>
              </select>
            </div>

            {tmsForm.tmsType !== 'none' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">TMS URL</label>
                  <input
                    type="url"
                    value={tmsForm.tmsUrl}
                    onChange={(e) => setTmsForm({ ...tmsForm, tmsUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="https://tms.example.com/api"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    value={tmsForm.tmsApiKey}
                    onChange={(e) => setTmsForm({ ...tmsForm, tmsApiKey: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Leave blank to keep current value"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username (Optional)</label>
                  <input
                    type="text"
                    value={tmsForm.tmsUsername}
                    onChange={(e) => setTmsForm({ ...tmsForm, tmsUsername: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tmsForm.autoSync}
                    onChange={(e) => setTmsForm({ ...tmsForm, autoSync: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto-sync job updates to TMS</span>
                </label>
              </>
            )}

            {formError && (
              <Alert type="error">{formError}</Alert>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Email Configuration */}
      {activeTab === 'email' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSaveEmailSettings} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
              <input
                type="text"
                value={emailForm.smtpHost}
                onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
              <input
                type="number"
                value={emailForm.smtpPort}
                onChange={(e) => setEmailForm({ ...emailForm, smtpPort: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP User</label>
              <input
                type="email"
                value={emailForm.smtpUser}
                onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
              <input
                type="password"
                value={emailForm.smtpPassword}
                onChange={(e) => setEmailForm({ ...emailForm, smtpPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Leave blank to keep current value"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
              <input
                type="email"
                value={emailForm.fromEmail}
                onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="noreply@logisticshub.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
              <input
                type="text"
                value={emailForm.fromName}
                onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Logistics Hub"
              />
            </div>

            {formError && (
              <Alert type="error">{formError}</Alert>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </h3>
              <Button
                onClick={() => setShowNewKeyModal(true)}
                variant="primary"
                icon={Plus}
                size="sm"
              >
                Generate Key
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No API keys yet</p>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{key.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                          {showApiKey[key.id] ? key.value : '•'.repeat(40)}
                        </code>
                        <button
                          onClick={() => setShowApiKey({ ...showApiKey, [key.id]: !showApiKey[key.id] })}
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          {showApiKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyToClipboard(key.value, 'API Key')}
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeApiKey(key.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Key Modal */}
          {showNewKeyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate API Key</h3>
                <form onSubmit={handleCreateApiKey} className="space-y-4">
                  {formError && <Alert type="error">{formError}</Alert>}
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g., Mobile App, Partner API)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewKeyModal(false);
                        setNewKeyName('');
                        setFormError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                      Generate
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// END OF SystemSettings.jsx
// ============================================================================
