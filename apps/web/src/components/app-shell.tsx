'use client';

import type { Me } from '@tastepilot/api-client';
import { cn } from '@tastepilot/ui';
import {
  BookOpen,
  CalendarDays,
  Compass,
  Home,
  NotebookPen,
  PartyPopper,
  Search,
  ShoppingBasket,
  Sparkles,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { track } from '@/lib/events';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/search', label: 'Search', Icon: Search },
  { href: '/discover', label: 'Discover', Icon: Compass },
  { href: '/party', label: 'Meal Parties', Icon: PartyPopper },
  { href: '/create', label: 'Create', Icon: Sparkles },
  { href: '/food-history', label: 'Food history', Icon: NotebookPen },
  { href: '/pantry', label: 'Pantry', Icon: ShoppingBasket },
  { href: '/restaurants', label: 'Restaurants', Icon: UtensilsCrossed },
  { href: '/cookbook', label: 'Cookbook', Icon: BookOpen },
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/profile', label: 'Profile', Icon: User },
] as const;

export function AppShell({
  user,
  userMenu,
  children,
}: {
  user: Me;
  userMenu: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => track('page_view', { path: pathname }), [pathname]);

  // Guests only ever see their own party.
  const items =
    user.kind === 'full'
      ? NAV
      : [{ href: `/party/${user.liteForPartyId}`, label: 'Your party', Icon: PartyPopper }];

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <nav
        aria-label="Main"
        className="border-b border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link
            href={user.kind === 'full' ? '/home' : `/party/${user.liteForPartyId}`}
            className="font-semibold text-brand"
          >
            TastePilot
          </Link>
          <div className="md:hidden">{userMenu}</div>
        </div>
        <ul className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden space-y-3 px-4 py-4 md:block">
          {userMenu}
          <ThemeToggle />
        </div>
      </nav>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
