import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="Taste profile, allergies, and what we've learned about you"
      />
      <Placeholder feature="Profile" />
    </>
  );
}
