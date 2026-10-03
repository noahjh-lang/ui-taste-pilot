'use client';

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../cn';
import { Button } from './button';

const CardContext = createContext<{ headingId: string; register: () => void } | null>(null);

/**
 * A card. When it has a CardHeader it becomes a labelled <section>, so it is
 * a landmark screen readers (and tests) can find by its title.
 */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const headingId = useId();
  const [hasHeader, setHasHeader] = useState(false);
  const Comp = hasHeader ? 'section' : 'div';
  return (
    <CardContext.Provider value={{ headingId, register: () => setHasHeader(true) }}>
      <Comp
        aria-labelledby={hasHeader ? headingId : undefined}
        className={cn('rounded-xl border border-border bg-surface', className)}
        {...props}
      >
        {children}
      </Comp>
    </CardContext.Provider>
  );
}

export function CardHeader({
  title,
  description,
  action,
  as: Heading = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  const card = useContext(CardContext);
  const register = card?.register;
  useLayoutEffect(() => register?.(), [register]);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div>
        <Heading id={card?.headingId} className="font-semibold">
          {title}
        </Heading>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'brand' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-muted text-foreground',
        // Foreground text on the tint: brand-colored text here fails WCAG AA contrast.
        tone === 'brand' && 'bg-brand/15 text-foreground',
        tone === 'outline' && 'border border-border text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' && 'size-7 text-xs',
        size === 'md' && 'size-9 text-sm',
        size === 'lg' && 'size-14 text-lg',
      )}
    >
      {initials}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="mb-3 text-3xl">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A failed load. Never blank: says what failed and offers a retry. */
export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-border bg-muted/50 px-5 py-6">
      <p className="font-medium">{title}</p>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}
