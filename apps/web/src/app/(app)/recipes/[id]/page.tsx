import { staticParams } from '@/lib/static-params';
import { RecipeDetailView } from './view';

export const generateStaticParams = () => staticParams('id');

export default function RecipeDetailPage() {
  return <RecipeDetailView />;
}
