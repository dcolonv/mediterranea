'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';

const NAV_SECTIONS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'services', label: 'Services', href: '/#services' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'contact', label: 'Contact', href: '/#contact' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const pathname = usePathname();

  // Track scroll position for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section via Intersection Observer
  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('');
      return;
    }

    // All observed sections including hero (mapped to "home" nav item)
    const sectionIds = ['hero', 'services', 'about', 'contact'];
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();

    const updateActive = () => {
      if (visibleSections.size === 0) {
        setActiveSection('');
        return;
      }
      // Pick the first visible section in DOM order
      for (const id of sectionIds) {
        if (visibleSections.has(id)) {
          // Map "hero" element to "home" nav item
          setActiveSection(id === 'hero' ? 'home' : id);
          return;
        }
      }
    };

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleSections.add(id);
          } else {
            visibleSections.delete(id);
          }
          updateActive();
        },
        { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [pathname]);

  function isActive(sectionId: string) {
    return activeSection === sectionId;
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-dark-900/95 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-24 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Image
              src="/logo_dark.svg"
              alt="Mediterranea Skin Lab"
              width={180}
              height={50}
              priority
            />
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:gap-x-10">
            {NAV_SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className={`elegant-underline text-sm tracking-widest uppercase transition-colors ${
                  isActive(section.id)
                    ? 'text-white elegant-underline-active'
                    : 'text-white-70 hover:text-white'
                }`}
              >
                {section.label}
              </Link>
            ))}
            <Link href="/appointments">
              <Button variant="elegant" size="sm">
                Book Now
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open menu</span>
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-white-10">
            <div className="flex flex-col space-y-6">
              {NAV_SECTIONS.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`text-sm tracking-widest uppercase ${
                    isActive(section.id)
                      ? 'text-gold'
                      : 'text-white-70 hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {section.label}
                </Link>
              ))}
              <Link href="/appointments" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="elegant" className="w-full">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
