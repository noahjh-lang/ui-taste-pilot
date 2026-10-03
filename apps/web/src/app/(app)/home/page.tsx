'use client';

import { HomeFeedView } from '@/features/recipes';
import { useMe } from '@/lib/session';

export default function HomePage() {
  const me = useMe();
  return <HomeFeedView name={me.name} />;
}
