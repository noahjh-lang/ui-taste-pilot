import { staticParams } from '@/lib/static-params';
import { PartyView } from './view';

export const generateStaticParams = () => staticParams('id');

export default function PartyPage() {
  return <PartyView />;
}
