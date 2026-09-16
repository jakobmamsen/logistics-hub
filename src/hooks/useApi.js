import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Attach the logged-in user's access token so the function can
      // identify the caller and apply row-level security.
      const { data: { session } } = await supabase.auth.getSession();

      const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
          ...options.headers,
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `API error: ${response.status}`);
      }

      return payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};

export default useApi;
