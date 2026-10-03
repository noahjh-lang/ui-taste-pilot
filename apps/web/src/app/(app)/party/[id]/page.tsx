import { staticParams } from '@/lib/static-params';
import { PartyPageView } from './view';

export const generateStaticParams = () => staticParams('id');

export default function PartyPage() {
  return <PartyPageView />;
}
