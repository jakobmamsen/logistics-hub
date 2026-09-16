const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const quoteApi = {
  // Get all quotes
  getAll: async () => {
    const response = await fetch(`${API_BASE}/quotes`);
    if (!response.ok) throw new Error('Failed to fetch quotes');
    return response.json();
  },

  // Get single quote
  getById: async (id) => {
    const response = await fetch(`${API_BASE}/quotes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch quote');
    return response.json();
  },

  // Create quote
  create: async (data) => {
    const response = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create quote');
    return response.json();
  },

  // Update quote
  update: async (id, data) => {
    const response = await fetch(`${API_BASE}/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update quote');
    return response.json();
  },

  // Delete quote
  delete: async (id) => {
    const response = await fetch(`${API_BASE}/quotes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete quote');
    return response.json();
  },
};

export default quoteApi;
