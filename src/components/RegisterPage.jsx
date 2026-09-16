// ============================================================================
// LOGISTICS HUB RELEASE 1 — REGISTRATION PAGE
// ============================================================================
// File: RegisterPage.jsx
// Purpose: New user account creation
// Dependencies: React, React Router, useAuth hook
// Status: Production-ready for Release 1
//
// Features:
// 1. Email/password registration
// 2. Password strength validation
// 3. Team selection
// 4. Email verification
// 5. Form validation & error handling
//
// ============================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Form from '../components/Form';
import Alert from '../components/Alert';
import { Mail, Lock, User, Building2, ArrowRight, UserPlus } from 'lucide-react';

/**
 * RegisterPage - New user registration
 * @component
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    team: '',
    agreeToTerms: false
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    return Math.min(strength, 5);
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setFormData({ ...formData, password: pwd });
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    if (!formData.email.trim()) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Full name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (!formData.team) {
      setError('Please select a team');
      setIsSubmitting(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        team: formData.team
      });

      if (result.success) {
        navigate('/login', {
          state: { message: 'Account created! Please check your email to verify.' }
        });
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return labels[strength - 1] || 'Very Weak';
  };

  const getPasswordStrengthColor = (strength) => {
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'];
    return colors[strength - 1] || 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      </div>

      {/* Registration Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            </div>
            <p className="text-gray-600">Join Logistics Hub</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert type="error">
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <Form.Group>
              <Form.Label htmlFor="email">Email Address</Form.Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setError(null);
                  }}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </Form.Group>

            {/* Full Name Field */}
            <Form.Group>
              <Form.Label htmlFor="name">Full Name</Form.Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setError(null);
                  }}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </Form.Group>

            {/* Team Selection */}
            <Form.Group>
              <Form.Label htmlFor="team">Company/Team</Form.Label>
              <div className="relative">
                <select
                  id="team"
                  value={formData.team}
                  onChange={(e) => {
                    setFormData({ ...formData, team: e.target.value });
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select your team...</option>
                  <option value="gla-norway">GLA Norway AS</option>
                  <option value="gla-denmark">GLA Denmark A/S</option>
                  <option value="gla-sweden">GLA Sweden AB</option>
                </select>
              </div>
            </Form.Group>

            {/* Password Field */}
            <Form.Group>
              <Form.Label htmlFor="password">Password</Form.Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition ${
                          i < passwordStrength
                            ? getPasswordStrengthColor(passwordStrength)
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Strength: <span className="font-semibold">{getPasswordStrengthLabel(passwordStrength)}</span>
                  </p>
                </div>
              )}
            </Form.Group>

            {/* Confirm Password Field */}
            <Form.Group>
              <Form.Label htmlFor="confirmPassword">Confirm Password</Form.Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Form.Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    setError(null);
                  }}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </Form.Group>

            {/* Terms & Conditions */}
            <Form.Group>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => {
                    setFormData({ ...formData, agreeToTerms: e.target.checked });
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 rounded mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                    Terms and Conditions
                  </a>
                </span>
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
              {isSubmitting || loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
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
// END OF RegisterPage.jsx
// ============================================================================
