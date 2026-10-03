import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export default async function PublicCookbookPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return (
    <>
      <PageHeader title="Cookbook" description={`@${handle}`} />
      <Placeholder feature="Public community cookbook" />
    </>
  );
}
