'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  LuLayoutDashboard,
  LuCalendarDays,
  LuClock,
  LuUsers,
  LuSparkles,
  LuBriefcase,
  LuDoorOpen,
  LuStar,
  LuGift,
  LuNewspaper,
  LuMegaphone,
  LuTrendingUp,
  LuShield,
  LuSettings,
  LuMenu,
  LuX,
  LuLogOut,
} from 'react-icons/lu';
import { Button } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { hasCapability, type Capability } from '@/lib/auth/capabilities';
import { getMyCapabilities } from '@/actions/team';

const NAV: { href: string; label: string; icon: IconType; cap?: Capability }[] = [
  { href: '/backoffice', label: 'Dashboard', icon: LuLayoutDashboard },
  { href: '/backoffice/calendar', label: 'Calendar', icon: LuCalendarDays, cap: 'calendar' },
  { href: '/backoffice/waitlist', label: 'Waitlist', icon: LuClock, cap: 'waitlist' },
  { href: '/backoffice/clients', label: 'Clients', icon: LuUsers, cap: 'clients' },
  { href: '/backoffice/services', label: 'Services', icon: LuSparkles, cap: 'services' },
  { href: '/backoffice/staff', label: 'Staff', icon: LuBriefcase, cap: 'staff' },
  { href: '/backoffice/rooms', label: 'Rooms', icon: LuDoorOpen, cap: 'rooms' },
  { href: '/backoffice/reviews', label: 'Reviews', icon: LuStar, cap: 'reviews' },
  { href: '/backoffice/gift-cards', label: 'Gift Cards', icon: LuGift, cap: 'giftcards' },
  { href: '/backoffice/blog', label: 'Blog', icon: LuNewspaper, cap: 'blog' },
  { href: '/backoffice/campaigns', label: 'Campaigns', icon: LuMegaphone, cap: 'campaigns' },
  { href: '/backoffice/reports', label: 'Reports', icon: LuTrendingUp, cap: 'reports' },
  { href: '/backoffice/team', label: 'Team', icon: LuShield, cap: 'team' },
  { href: '/backoffice/settings', label: 'Settings', icon: LuSettings, cap: 'settings' },
];

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [caps, setCaps] = useState<string[] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getMyCapabilities().then(setCaps);
  }, []);

  const visibleNav = NAV.filter((n) => !n.cap || hasCapability(caps, n.cap));

  // Close the mobile drawer when the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.push('/login');
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

  function isActive(href: string) {
    return href === '/backoffice' ? pathname === '/backoffice' : pathname.startsWith(href);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="text-white-50">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isAdmin) return null;

  const brand = (
    <Link href="/backoffice" className="flex flex-col">
      <span className="font-serif text-xl uppercase tracking-[0.15em] text-white">Mediterranea</span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-gold">Backoffice</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile top bar */}
      <div className="flex h-16 items-center justify-between border-b border-white-10 bg-dark-800 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="cursor-pointer p-2 text-white-70 transition-colors hover:text-white"
        >
          <LuMenu className="h-6 w-6" />
        </button>
        {brand}
        <div className="w-10" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white-10 bg-dark-800 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white-10 px-6">
          {brand}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="cursor-pointer p-1 text-white-70 transition-colors hover:text-white lg:hidden"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm tracking-wide transition-colors ${
                  active
                    ? 'border-gold bg-gold/10 text-white'
                    : 'border-transparent text-white-70 hover:bg-white-10 hover:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-gold' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white-10 px-4 py-4">
          <p className="mb-3 truncate text-xs text-white-50" title={user.email ?? ''}>
            {user.displayName || user.email}
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LuLogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
