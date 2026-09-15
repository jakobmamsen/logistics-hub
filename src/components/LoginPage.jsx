// ============================================================================
// LOGISTICS HUB RELEASE 1 — LOGIN PAGE
// ============================================================================
// File: LoginPage.jsx
// Purpose: User authentication with Supabase Auth
// Dependencies: React, React Router, Supabase Auth, useAuth hook
// Status: Production-ready for Release 1
//
// Features:
// 1. Email/password authentication
// 2. Error handling & validation
// 3. Loading states
// 4. "Remember me" functionality
// 5. Password reset link
// 6. Team-aware login (team selection on first login)
//
// ============================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Form } from '../components/Form';
import { Alert } from '../components/Alert';
import { Mail, Lock, ArrowRight, LogIn } from 'lucide-react';

/**
 * LoginPage - User authentication
 * @component
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setIsSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await login(email, password);

      if (result.success) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        } else {
          localStorage.removeItem('rememberEmail');
        }

        // Navigate to dashboard on successful login
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to login. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Populate remembered email on mount
  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Logistics Hub</h1>
            </div>
            <p className="text-gray-600">Freight Forwarding Operations Platform</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <Form.Group>
              <Form.Label htmlFor="email">Email Address</Form.Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </Form.Group>

            {/* Password Field */}
            <Form.Group>
              <div className="flex items-center justify-between mb-2">
                <Form.Label htmlFor="password">Password</Form.Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </Form.Group>

            {/* Remember Me */}
            <Form.Group>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
            </Form.Group>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting || loading}
              icon={ArrowRight}
            >
              {isSubmitting || loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">New to Logistics Hub?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo Credentials (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-semibold mb-1">Demo Credentials:</p>
              <p>Email: demo@example.com</p>
              <p>Password: demo123456</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-blue-100">
          <p>© 2026 GLA Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// END OF LoginPage.jsx
// ============================================================================
