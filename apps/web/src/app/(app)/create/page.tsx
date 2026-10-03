'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CreateRecipeView } from '@/features/recipes';

function Create() {
  return <CreateRecipeView editId={useSearchParams().get('edit')} />;
}

export default function CreatePage() {
  return (
    <Suspense>
      <Create />
    </Suspense>
  );
}
