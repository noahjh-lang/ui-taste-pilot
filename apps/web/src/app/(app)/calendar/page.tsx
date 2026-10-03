import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Calendar' };

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" description="Family meal calendar" />
      <Placeholder feature="Calendar" />
    </>
  );
}
