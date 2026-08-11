'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { hasCapability, type Capability } from '@/lib/auth/capabilities';
import { getMyCapabilities } from '@/actions/team';

const NAV: { href: string; label: string; cap?: Capability }[] = [
  { href: '/backoffice', label: 'Dashboard' },
  { href: '/backoffice/calendar', label: 'Calendar', cap: 'calendar' },
  { href: '/backoffice/waitlist', label: 'Waitlist', cap: 'waitlist' },
  { href: '/backoffice/clients', label: 'Clients', cap: 'clients' },
  { href: '/backoffice/services', label: 'Services', cap: 'services' },
  { href: '/backoffice/staff', label: 'Staff', cap: 'staff' },
  { href: '/backoffice/rooms', label: 'Rooms', cap: 'rooms' },
  { href: '/backoffice/reviews', label: 'Reviews', cap: 'reviews' },
  { href: '/backoffice/gift-cards', label: 'Gift Cards', cap: 'giftcards' },
  { href: '/backoffice/blog', label: 'Blog', cap: 'blog' },
  { href: '/backoffice/campaigns', label: 'Campaigns', cap: 'campaigns' },
  { href: '/backoffice/reports', label: 'Reports', cap: 'reports' },
  { href: '/backoffice/team', label: 'Team', cap: 'team' },
  { href: '/backoffice/settings', label: 'Settings', cap: 'settings' },
];

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [caps, setCaps] = useState<string[] | null>(null);

  useEffect(() => {
    getMyCapabilities().then(setCaps);
  }, []);

  const visibleNav = NAV.filter((n) => !n.cap || hasCapability(caps, n.cap));

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!user.isAdmin) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-white-50">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-white-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-10">
              <Link href="/backoffice" className="flex flex-col">
                <span className="font-serif text-xl tracking-[0.15em] text-white uppercase">
                  Mediterranea
                </span>
                <span className="text-[10px] tracking-[0.2em] text-gold uppercase">
                  Backoffice
                </span>
              </Link>
              <nav className="hidden md:flex flex-wrap gap-x-5 gap-y-1">
                {visibleNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm tracking-wider text-white-70 hover:text-white transition-colors uppercase"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm text-white-50">
                {user.displayName || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{children}</main>
    </div>
  );
}
