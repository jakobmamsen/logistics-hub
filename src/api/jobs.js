const API_BASE = process.env.VITE_API_BASE_URL || '/api';

export const jobApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/jobs`);
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE}/jobs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    return response.json();
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create job');
    return response.json();
  },

  update: async (id, data) => {
    const response = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update job');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete job');
    return response.json();
  },
};

export default jobApi;
