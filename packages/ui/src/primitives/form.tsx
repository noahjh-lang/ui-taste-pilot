'use client';

import { Label as RadixLabel, Switch as RadixSwitch } from 'radix-ui';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  cloneElement,
} from 'react';
import { cn } from '../cn';

const control =
  'w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ' +
  'aria-[invalid=true]:border-foreground aria-[invalid=true]:border-2 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, 'min-h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-2', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(control, 'min-h-11 pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Label({ className, ...props }: React.ComponentProps<typeof RadixLabel.Root>) {
  return <RadixLabel.Root className={cn('text-sm font-medium', className)} {...props} />;
}

/**
 * Label + control + hint + error, wired with ids and aria attributes.
 * The child control receives id, aria-describedby and aria-invalid.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, {
        id,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-foreground" role="alert">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-[state=checked]:bg-brand disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-1 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-6" />
      </RadixSwitch.Root>
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex min-h-11 items-center gap-2', className)}>
      <input id={id} type="checkbox" className="size-5 accent-[var(--brand)]" {...props} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}
