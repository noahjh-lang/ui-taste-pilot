import { staticParams } from '@/lib/static-params';
import { PublicRecipePage as View } from './view';

export const generateStaticParams = () => staticParams('id');

export default function Page() {
  return <View />;
}
