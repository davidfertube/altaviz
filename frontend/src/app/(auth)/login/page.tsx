'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AltavizLogo from '@/components/brand/AltavizLogo';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const registered = searchParams.get('registered');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (registered === 'true') {
      toast.success('Account created! Please sign in.');
    }
  }, [registered]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error('Invalid email or password');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-[#E7E0D5] bg-white p-8 shadow-sm">
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#1C1917]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/50 focus:border-[#C4A77D]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#1C1917]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/50 focus:border-[#C4A77D]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold text-white bg-[#C4A77D] hover:bg-[#A68B5B] transition-colors px-6 py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[#78716C] mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-[#C4A77D] hover:text-[#A68B5B]">
          Sign up
        </Link>
      </p>
      <p className="text-center text-xs text-[#A8A29E] mt-2">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#C4A77D]/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#A68B5B]/6 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#C4A77D] flex items-center justify-center text-[#C4A77D]">
              <AltavizLogo size={24} variant="white" />
            </div>
            <span className="text-2xl font-bold text-[#1C1917] tracking-tight">Altaviz</span>
          </Link>
          <p className="text-[#78716C] text-sm">Sign in to your monitoring dashboard</p>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border border-[#E7E0D5] bg-white p-8 text-center text-[#78716C] text-sm">
            Loading...
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
