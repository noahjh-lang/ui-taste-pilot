'use client';

import {
  Dialog as RadixDialog,
  DropdownMenu as RadixMenu,
  Tabs as RadixTabs,
  Tooltip as RadixTooltip,
} from 'radix-ui';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { Button } from './button';

// --- Dialog --------------------------------------------------------------------

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-xl',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
            'focus:outline-none',
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="-m-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X className="size-5" aria-hidden />
              </button>
            </RadixDialog.Close>
          </div>
          {children}
          {footer && (
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;

/** Asks before doing something that can't be undone. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<unknown>;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

// --- Tabs -----------------------------------------------------------------------

export function Tabs({
  value,
  onValueChange,
  tabs,
  label,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Array<{ value: string; label: ReactNode }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        aria-label={label}
        className="mb-4 flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px min-h-11 border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand data-[state=active]:border-brand data-[state=active]:font-medium data-[state=active]:text-foreground"
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;

// --- Tooltip --------------------------------------------------------------------

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={200}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-50 max-w-xs rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-lg"
        >
          {content}
          <RadixTooltip.Arrow className="fill-foreground" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

// --- Menu -----------------------------------------------------------------------

export function Menu({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  label: string;
  items: Array<{ label: ReactNode; onSelect: () => void } | 'separator'>;
}) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild aria-label={label}>
        {trigger}
      </RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <RadixMenu.Separator key={i} className="my-1 h-px bg-border" />
            ) : (
              <RadixMenu.Item
                key={i}
                onSelect={item.onSelect}
                className="flex min-h-10 cursor-pointer items-center rounded-md px-3 text-sm outline-none data-[highlighted]:bg-muted"
              >
                {item.label}
              </RadixMenu.Item>
            ),
          )}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}
