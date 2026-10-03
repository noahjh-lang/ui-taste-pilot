'use client';

import { Toast as RadixToast } from 'radix-ui';
import { useSyncExternalStore } from 'react';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a short, non-blocking confirmation. */
export function toast(title: string, description?: string) {
  items = [...items, { id: nextId++, title, description }].slice(-3);
  emit();
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  );
  return (
    <RadixToast.Provider duration={4000}>
      {current.map((t) => (
        <RadixToast.Root
          key={t.id}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className="rounded-lg border border-border bg-surface px-4 py-3 shadow-lg"
        >
          <RadixToast.Title className="text-sm font-medium">{t.title}</RadixToast.Title>
          {t.description && (
            <RadixToast.Description className="mt-0.5 text-sm text-muted-foreground">
              {t.description}
            </RadixToast.Description>
          )}
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}
