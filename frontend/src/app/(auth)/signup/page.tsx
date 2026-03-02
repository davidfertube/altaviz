'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AltavizLogo from '@/components/brand/AltavizLogo';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined, company: company || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#F5C518]/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#D4A80F]/6 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F5C518] flex items-center justify-center text-[#F5C518]">
              <AltavizLogo size={24} variant="white" />
            </div>
            <span className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Altaviz</span>
          </Link>
          <p className="text-[#6B7280] text-sm">Create your free monitoring account</p>
        </div>

        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-[#0A0A0A]">
                Name <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="company" className="text-sm font-medium text-[#0A0A0A]">
                Company
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#0A0A0A]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#0A0A0A]">
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
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-semibold text-white bg-[#F5C518] hover:bg-[#D4A80F] transition-colors px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#F5C518] hover:text-[#D4A80F]">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-[#9CA3AF] mt-2">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
