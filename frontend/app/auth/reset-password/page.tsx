'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, KeyRound, Eye, EyeOff } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

const pageShell = 'min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4';
const card = 'max-w-md w-full bg-white rounded-2xl shadow-xl p-8';
const primaryButton =
  'w-full px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
const input =
  'w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-600 focus:border-transparent';

// Opened from the link in the password reset email: /auth/reset-password?token=...
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || 'Could not reset your password. Please try again.');
        return;
      }

      // Any session stored in this browser belongs to the old password
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('finsync-user');
      setDone(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className={pageShell}>
        <div className={`${card} text-center`}>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset link is incomplete</h1>
          <p className="text-gray-600 mb-6">
            Open the link from your password reset email again, or request a new one from the sign-in screen.
          </p>
          <button onClick={() => router.push('/')} className={primaryButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={pageShell}>
        <div className={`${card} text-center`}>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Password changed</h1>
          <p className="text-gray-600 mb-6">
            You can now sign in with your new password. Other devices have been signed out.
          </p>
          <button onClick={() => router.push('/')} className={primaryButton}>
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShell}>
      <div className={card}>
        <div className="text-center mb-6">
          <KeyRound className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Choose a new password</h1>
          <p className="text-gray-600">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                className={`${input} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={input}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={primaryButton}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Change password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => router.push('/')} className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={pageShell}>
          <div className={`${card} text-center`}>
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
