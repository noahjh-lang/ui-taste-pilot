import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Meal Party" description={`Party ${id}`} />
      <Placeholder feature="Meal Party host dashboard" />
    </>
  );
}
