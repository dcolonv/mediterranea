'use client';

import { getIdToken, signOut } from '@/lib/firebase/auth';

/** Exchange the current Firebase idToken for a server session cookie. */
export async function establishCustomerSession(): Promise<void> {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Could not obtain an auth token.');
  const res = await fetch('/api/auth/customer-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('Could not start your session.');
}

/** Sign out of Firebase and clear the server session cookie. */
export async function endCustomerSession(): Promise<void> {
  try {
    await signOut();
  } finally {
    await fetch('/api/auth/customer-session', { method: 'DELETE' });
  }
}

/** Where to go after auth: honor a ?redirect param, else the account home. */
export function postAuthRedirect(): string {
  if (typeof window === 'undefined') return '/init/account';
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/init/account') ? r : '/init/account';
}
