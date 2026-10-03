import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Discover' };

export default function DiscoverPage() {
  return (
    <>
      <PageHeader title="Discover" description="New recipes that fit your evolving taste" />
      <Placeholder feature="Discover" />
    </>
  );
}
