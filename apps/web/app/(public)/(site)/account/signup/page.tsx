'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { establishCustomerSession, postAuthRedirect } from '@/lib/auth/customer-client';

export default function CustomerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterAuth() {
    await establishCustomerSession();
    router.replace(postAuthRedirect());
    router.refresh();
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      await afterAuth();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === 'auth/email-already-in-use'
          ? 'An account with this email already exists. Try signing in.'
          : 'Could not create your account. Please try again.'
      );
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
          <h1 className="font-serif text-3xl text-white">Create your account</h1>
          <p className="mt-2 text-sm text-white-50">
            Book faster and manage your appointments.
          </p>
        </div>

        <div className="border border-white-10 bg-dark-800/50 p-8">
          <form onSubmit={onSignup} className="space-y-5">
            <Input id="name" label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" variant="elegant" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
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

          <p className="mt-6 text-center text-sm text-white-50">
            Already have an account?{' '}
            <Link href="/account/login" className="text-gold hover:text-gold-light">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
