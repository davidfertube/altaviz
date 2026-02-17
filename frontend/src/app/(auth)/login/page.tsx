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

  const handleOAuthLogin = (provider: string) => {
    setLoading(true);
    signIn(provider, { callbackUrl });
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E7E0D5]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#A8A29E]">or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 text-sm font-semibold text-[#1C1917] bg-[#F5F0E8] hover:bg-[#EDE6D8] transition-colors px-6 py-3 rounded-xl disabled:opacity-50 border border-[#E7E0D5]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </button>

        </div>
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
