import { staticParams } from '@/lib/static-params';
import { RecipeDetailPageView } from './view';

export const generateStaticParams = () => staticParams('id');

export default function RecipeDetailPage() {
  return <RecipeDetailPageView />;
}
