'use client';

import type { StatementParse } from '@tastepilot/api-client';
import { Badge, Button, Field, Textarea, toast } from '@tastepilot/ui';
import { useState } from 'react';
import { errorMessage } from '@/lib/query-client';
import { useApplyStatement, useParseStatement } from '../api/queries';

export function ParsePreview({ result }: { result: StatementParse }) {
  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
      aria-live="polite"
    >
      <p className="font-medium">Here’s how we understood that:</p>
      {result.constraints.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Allergies & diets (strict)
          </p>
          <ul className="mt-1 space-y-1">
            {result.constraints.map((c) => (
              <li key={`${c.kind}:${c.key}`} className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{c.label}</Badge>
                <span className="text-muted-foreground">
                  from “{c.matchedText}” · rule <code>{c.rule}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.preferences.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Taste</p>
          <ul className="mt-1 space-y-1">
            {result.preferences.map((p) => (
              <li key={`${p.prefType}:${p.key}`} className="flex flex-wrap items-center gap-2">
                <Badge>
                  {p.sentiment === 'like' ? '♥ likes' : '✕ dislikes'} {p.label}
                </Badge>
                <span className="text-muted-foreground">
                  {p.prefType} · rule <code>{p.rule}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.unrecognized.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Not understood
          </p>
          <ul className="mt-1 space-y-1">
            {result.unrecognized.map((u) => (
              <li key={u.text}>
                “{u.text}”{u.hint && <span className="text-muted-foreground"> · {u.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Plain-language input, parsed by the server's fixed rule set. The user sees
 * exactly what will be recorded before anything changes.
 */
export function StatementBox() {
  const [text, setText] = useState('');
  const parse = useParseStatement();
  const apply = useApplyStatement();
  const preview = parse.data && parse.data.text === text ? parse.data : null;
  const canApply = !!preview && (preview.constraints.length > 0 || preview.preferences.length > 0);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 3) return;
        if (!preview) {
          parse.mutate(text);
          return;
        }
        apply.mutate(text, {
          onSuccess: () => {
            toast('Profile updated', 'Recommendations and safety checks now use this.');
            setText('');
            parse.reset();
          },
          onError: (err) => toast('Couldn’t update your profile', errorMessage(err)),
        });
      }}
    >
      <Field
        label="Tell us in your own words"
        hint="e.g. “I’m allergic to tree nuts and I love spicy food, but not cilantro.”"
        error={parse.error ? errorMessage(parse.error) : undefined}
      >
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
      </Field>
      {preview && <ParsePreview result={preview} />}
      <div className="flex flex-wrap gap-2">
        {!preview ? (
          <Button
            type="submit"
            variant="secondary"
            loading={parse.isPending}
            disabled={text.trim().length < 3}
          >
            Check what we understood
          </Button>
        ) : (
          <>
            <Button type="submit" loading={apply.isPending} disabled={!canApply}>
              Save to my profile
            </Button>
            <Button variant="ghost" onClick={() => parse.reset()}>
              Edit
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
