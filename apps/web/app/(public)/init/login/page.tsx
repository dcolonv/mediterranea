'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { establishCustomerSession, postAuthRedirect } from '@/lib/auth/customer-client';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterAuth() {
    await establishCustomerSession();
    router.replace(postAuthRedirect());
    router.refresh();
  }

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      await afterAuth();
    } catch {
      setError('Incorrect email or password.');
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      await afterAuth();
    } catch {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-dark-900 px-6 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-3xl text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-white-50">Sign in to manage your appointments.</p>
        </div>

        <div className="border border-white-10 bg-dark-800/50 p-8">
          <form onSubmit={onEmailLogin} className="space-y-5">
            <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" variant="elegant" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-white-10" />
            <span className="text-xs uppercase tracking-wider text-white-30">or</span>
            <span className="h-px flex-1 bg-white-10" />
          </div>

          <Button variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <div className="mt-6 flex justify-between text-sm text-white-50">
            <Link href="/init/reset" className="hover:text-white">
              Forgot password?
            </Link>
            <Link href="/init/signup" className="text-gold hover:text-gold-light">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
