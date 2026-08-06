'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { sendPasswordReset } from '@/lib/firebase/auth';

export default function CustomerResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Don't reveal whether the email exists.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-dark-900 px-6 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-3xl text-white">Reset password</h1>
          <p className="mt-2 text-sm text-white-50">
            We’ll email you a link to set a new password.
          </p>
        </div>

        <div className="border border-white-10 bg-dark-800/50 p-8">
          {sent ? (
            <div className="text-center">
              <p className="text-white-70">
                If an account exists for <span className="text-white">{email}</span>, a reset link
                is on its way.
              </p>
              <Link href="/init/login" className="mt-6 inline-block text-gold hover:text-gold-light">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onReset} className="space-y-5">
              <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" variant="elegant" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-white-50">
                <Link href="/init/login" className="hover:text-white">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
