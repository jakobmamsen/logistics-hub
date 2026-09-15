const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions'

export async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

export const API = {
  quotes: {
    list: () => apiCall('/quote-api-handlers?action=list'),
    get: (id) => apiCall(`/quote-api-handlers?id=${id}`),
    create: (data) => apiCall('/quote-api-handlers', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    update: (id, data) => apiCall(`/quote-api-handlers?id=${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
    delete: (id) => apiCall(`/quote-api-handlers?id=${id}`, { 
      method: 'DELETE' 
    }),
  },
  jobs: {
    list: () => apiCall('/jobs-api-handlers?action=list'),
    get: (id) => apiCall(`/jobs-api-handlers?id=${id}`),
    create: (data) => apiCall('/jobs-api-handlers', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    update: (id, data) => apiCall(`/jobs-api-handlers?id=${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  },
}
