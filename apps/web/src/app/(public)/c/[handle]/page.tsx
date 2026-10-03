import { staticParams } from '@/lib/static-params';
import { PublicCookbookPage as View } from './view';

export const generateStaticParams = () => staticParams('handle');

export default function Page() {
  return <View />;
}
