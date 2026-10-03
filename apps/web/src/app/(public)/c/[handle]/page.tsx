import { staticParams } from '@/lib/static-params';
import { PublicCookbookView } from './view';

export const generateStaticParams = () => staticParams('handle');

export default function PublicCookbookPage() {
  return <PublicCookbookView />;
}
