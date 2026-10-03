import { staticParams } from '@/lib/static-params';
import { InviteLandingView } from './view';

export const generateStaticParams = () => staticParams('token');

export default function InviteLandingPage() {
  return <InviteLandingView />;
}
