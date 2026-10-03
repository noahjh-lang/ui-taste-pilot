'use client';

import type { Me } from '@tastepilot/api-client';
import { Avatar, Menu } from '@tastepilot/ui';
import { useRouter } from 'next/navigation';
import { useLogout } from '../api/mutations';

export function UserMenu({ user }: { user: Me }) {
  const router = useRouter();
  const logout = useLogout();
  return (
    <Menu
      label="Account menu"
      trigger={
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
        </button>
      }
      items={[
        ...(user.kind === 'full'
          ? [
              { label: 'Your taste profile', onSelect: () => router.push('/profile') },
              ...(user.handle
                ? [
                    {
                      label: 'Your public cookbook',
                      onSelect: () => router.push(`/c/${user.handle}`),
                    },
                  ]
                : []),
            ]
          : [{ label: 'Save your profile', onSelect: () => router.push('/claim') }]),
        'separator' as const,
        {
          label: 'Log out',
          onSelect: () => logout.mutate(undefined, { onSettled: () => router.replace('/') }),
        },
      ]}
    />
  );
}
