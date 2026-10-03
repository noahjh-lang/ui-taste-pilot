import { Suspense } from 'react';
import { SearchView } from '@/features/recipes';

export const metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
