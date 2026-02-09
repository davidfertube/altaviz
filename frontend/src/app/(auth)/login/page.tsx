'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await signIn('credentials', { email, callbackUrl });
  };

  const handleAzureLogin = () => {
    setLoading(true);
    signIn('microsoft-entra-id', { callbackUrl });
  };

  return (
    <>
      {/* Login Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        {/* Azure AD Button */}
        <button
          onClick={handleAzureLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 text-sm font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] transition-colors px-6 py-3 rounded-xl disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
            <path d="M0 0h10v10H0z" fill="#F25022"/>
            <path d="M11 0h10v10H11z" fill="#7FBA00"/>
            <path d="M0 11h10v10H0z" fill="#00A4EF"/>
            <path d="M11 11h10v10H11z" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </button>

        {/* Development login */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0A0E17] px-3 text-white/30">Development only</span>
              </div>
            </div>

            <form onSubmit={handleDevLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/60 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@altaviz.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#1F77B4]/50 focus:border-[#1F77B4]/50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm font-semibold text-white bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] hover:opacity-90 transition-opacity px-6 py-2.5 rounded-xl disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Dev Sign In'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-white/20 mt-6">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#1F77B4]/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#6C5CE7]/8 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1F77B4] to-[#6C5CE7] flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Altaviz</span>
          </Link>
          <p className="text-white/40 text-sm">Sign in to your monitoring dashboard</p>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center text-white/40 text-sm">
            Loading...
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
