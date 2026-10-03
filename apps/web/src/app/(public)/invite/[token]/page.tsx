import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <PageHeader title="You're invited to a Meal Party" description={`Invite ${token}`} />
      <Placeholder feature="Invite acceptance / lite-account join" />
    </>
  );
}
