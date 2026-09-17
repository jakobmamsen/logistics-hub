import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        // Fetch user role if logged in
        if (session?.user) {
          // name lives on users; role comes via role_assignment -> role
          const { data: profile } = await supabase
            .from('users')
            .select('id, name, email, status')
            .eq('id', session.user.id)
            .maybeSingle();
          setCurrentUser(profile || null);

          const { data: roles } = await supabase
            .from('role_assignment')
            .select('role:role_id ( name )')
            .eq('user_id', session.user.id);
          const names = (roles || []).map((r) => r.role?.name).filter(Boolean);
          const rank = ['admin', 'manager', 'commercial', 'finance', 'operations'];
          setUserRole(rank.find((r) => names.includes(r)) || null);
        }
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
      const newUser = data?.user;
      if (!newUser) throw new Error('User creation failed - no user returned');
      // users table: no role or team columns - those are separate tables
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ id: newUser.id, email, name, status: 'active' }]);
      if (profileError) throw profileError;

      if (team) {
        await supabase.from('team_member')
          .insert([{ user_id: newUser.id, team_id: team, is_primary: true }]);
      }

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
      setUserRole(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const hasRole = (role) => {
    return userRole === role || userRole === 'admin';
  };

  return { 
    user, 
    currentUser: currentUser || user,
    loading, 
    error, 
    login, 
    register, 
    logout,
    userRole,
    hasRole
  };
};

export default useAuth;
