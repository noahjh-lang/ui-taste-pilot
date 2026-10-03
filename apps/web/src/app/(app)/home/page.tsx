import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Home' };

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" description="Your personalized feed" />
      <Placeholder feature="Home" />
    </>
  );
}
