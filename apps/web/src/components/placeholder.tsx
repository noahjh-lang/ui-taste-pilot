/** Marks a route that exists in the routing skeleton but is not built yet. */
export function Placeholder({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
      {feature} is not implemented yet. See <code>NOT_IMPLEMENTED.md</code>.
    </div>
  );
}
