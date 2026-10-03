import { staticParams } from '@/lib/static-params';
import { PublicRecipeView } from './view';

export const generateStaticParams = () => staticParams('id');

export default function PublicRecipePage() {
  return <PublicRecipeView />;
}
