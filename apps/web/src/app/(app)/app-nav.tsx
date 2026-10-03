'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/discover', label: 'Discover' },
  { href: '/party/demo', label: 'Meal Party', match: '/party' },
  { href: '/food-history', label: 'Food history' },
  { href: '/pantry', label: 'Pantry' },
  { href: '/restaurants', label: 'Restaurants' },
  { href: '/cookbook', label: 'Cookbook' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/profile', label: 'Profile' },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-b border-border bg-surface md:min-h-dvh md:w-56 md:border-r md:border-b-0"
    >
      <div className="flex h-14 items-center px-4 font-semibold text-brand">
        <Link href="/home">TastePilot</Link>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith('match' in item ? item.match : item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-sm whitespace-nowrap ${
                  active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
