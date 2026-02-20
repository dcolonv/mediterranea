'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/components/providers';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.isAdmin) {
        router.push('/backoffice');
      } else {
        setError('You are not authorized to access the admin area.');
      }
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    setError(null);
    setIsSigningIn(true);

    try {
      await signIn();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-white-50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-6">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-0 w-px h-32 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
      <div className="absolute bottom-1/4 right-0 w-px h-32 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl tracking-[0.2em] text-white uppercase">
              Mediterranea
            </span>
            <span className="block text-[10px] tracking-[0.3em] text-white-50 uppercase mt-1">
              Skin Lab
            </span>
          </Link>
        </div>

        {/* Login card */}
        <div className="border border-white-10 bg-dark-800/50 p-10">
          <div className="text-center mb-8">
            <div className="mb-4 flex items-center justify-center gap-4">
              <span className="h-px w-8 bg-gold" />
              <span className="text-xs tracking-[0.3em] text-gold uppercase">
                Admin
              </span>
              <span className="h-px w-8 bg-gold" />
            </div>
            <h1 className="font-serif text-2xl text-white">
              Sign In
            </h1>
            <p className="text-sm text-white-50 mt-2">
              Access the backoffice dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            variant="outline"
            className="w-full flex items-center justify-center gap-3"
            size="lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <p className="mt-8 text-xs text-center text-white-30">
            Only authorized administrators can access the backoffice.
          </p>
        </div>

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="elegant-underline text-sm text-white-50 hover:text-white transition-colors"
          >
            &larr; Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
