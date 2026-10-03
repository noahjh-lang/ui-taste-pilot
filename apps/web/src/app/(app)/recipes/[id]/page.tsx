import { PageHeader } from '@/components/page-header';
import { Placeholder } from '@/components/placeholder';
import { RecipeSafetyBadge } from '@/features/safety';

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title={`Recipe ${id}`} />
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Safety for you:</span>
        <RecipeSafetyBadge recipeId={id} />
      </div>
      <Placeholder feature="Recipe detail" />
    </>
  );
}
