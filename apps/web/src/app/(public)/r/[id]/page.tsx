import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export default async function PublicRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Recipe" description={`Public recipe ${id}`} />
      <Placeholder feature="Public (SEO) recipe page" />
    </>
  );
}
