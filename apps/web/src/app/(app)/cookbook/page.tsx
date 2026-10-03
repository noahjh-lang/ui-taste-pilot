import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Cookbook' };

export default function CookbookPage() {
  return (
    <>
      <PageHeader title="Cookbook" description="Your community cookbook" />
      <Placeholder feature="Cookbook" />
    </>
  );
}
