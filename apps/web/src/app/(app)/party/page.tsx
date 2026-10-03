'use client';

import { PartyListView } from '@/features/meal-party';
import { useMe } from '@/lib/session';

export default function PartiesPage() {
  return <PartyListView user={useMe()} />;
}
