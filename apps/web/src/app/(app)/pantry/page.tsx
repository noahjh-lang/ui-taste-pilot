import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Pantry' };

export default function PantryPage() {
  return (
    <>
      <PageHeader title="Pantry" description="What you have on hand" />
      <Placeholder feature="Pantry" />
    </>
  );
}
