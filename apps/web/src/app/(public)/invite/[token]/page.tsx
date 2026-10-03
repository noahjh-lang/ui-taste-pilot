import { staticParams } from '@/lib/static-params';
import { InvitePage } from './view';

export const generateStaticParams = () => staticParams('token');

export default function Page() {
  return <InvitePage />;
}
