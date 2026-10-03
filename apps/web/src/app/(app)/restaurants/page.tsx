import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Restaurants' };

export default function RestaurantsPage() {
  return (
    <>
      <PageHeader title="Restaurants" description="Restaurant recommendations" />
      <Placeholder feature="Restaurants" />
    </>
  );
}
