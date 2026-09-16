import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, name, team }) => {
    setLoading(true);
    setError(null);
    try {
      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      console.log("Signup response:", { data, signUpError });
      if (signUpError) throw signUpError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: newUser.id,
          email,
          full_name: name,
          team_id: team,
          role: 'user'
        }]);
      if (profileError) throw profileError;

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, error, login, register, logout };
};

export default useAuth;
