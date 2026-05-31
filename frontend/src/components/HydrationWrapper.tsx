'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store';

// Pages where bottom nav is hidden — match BottomNav HIDDEN_ON list
const NO_NAV_PAGES: RegExp[] = [
  /^\/login(\/.*)?$/,
  /^\/create(\/.*)?$/,
  /^\/settings(\/.*)?$/,
  /^\/messages\/.+/,
  /^\/post\/.+/,
];

/**
 * Hydrates Zustand auth store on client mount,
 * and conditionally adds bottom padding only when nav is visible.
 */
export default function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasNav = !NO_NAV_PAGES.some(re => re.test(pathname));

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <main className={hasNav ? 'pb-16' : ''}>
      {children}
    </main>
  );
}
