'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // Store auth tokens
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('finsync-user', JSON.stringify(data.user));
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Failed to verify email. Please try again or contact support.');
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail) {
      alert('Please enter your email address');
      return;
    }

    setResending(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Verification email sent! Please check your inbox.');
        setResendEmail('');
      } else {
        alert(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend error:', error);
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifying Your Email</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Go to Dashboard Now
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                Resend Verification Email
              </h2>
              <form onSubmit={handleResendVerification} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
