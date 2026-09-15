const API_BASE = process.env.VITE_API_BASE_URL || '/api';

export const preAlertApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/pre-alerts`);
    if (!response.ok) throw new Error('Failed to fetch pre-alerts');
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE}/pre-alerts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch pre-alert');
    return response.json();
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE}/pre-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create pre-alert');
    return response.json();
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE}/pre-alerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update pre-alert');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE}/pre-alerts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete pre-alert');
    return response.json();
  },
};

export default preAlertApi;
