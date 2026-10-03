import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <>
      <PageHeader title="Search" description="Search ranked by your taste" />
      <Placeholder feature="Search" />
    </>
  );
}
