import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Food history' };

export default function FoodHistoryPage() {
  return (
    <>
      <PageHeader title="Food history" description="Meals cooked at home and eaten out" />
      <Placeholder feature="Food history" />
    </>
  );
}
