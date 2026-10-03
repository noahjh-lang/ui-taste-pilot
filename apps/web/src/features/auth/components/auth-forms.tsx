'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ApiError,
  claimInputSchema,
  loginInputSchema,
  signupInputSchema,
  type ClaimInput,
  type LoginInput,
  type SignupInput,
} from '@tastepilot/api-client';
import { Button, Field, Input } from '@tastepilot/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { errorMessage } from '@/lib/query-client';
import { useClaim, useLogin, useSignup } from '../api/mutations';

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

/** Only same-site, in-app paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/home';
}

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError && error.isRateLimited && error.retryAfter
      ? `${error.message} (about ${Math.ceil(error.retryAfter / 60)} min)`
      : errorMessage(error);
  return (
    <p role="alert" className="rounded-md bg-muted px-3 py-2 text-sm">
      {message}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => router.replace(next) }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register('password')} />
      </Field>
      <FormError error={login.error} />
      <Button type="submit" className="w-full" loading={login.isPending}>
        Log in
      </Button>
      {MOCKING && (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts (stub backend)</p>
          <p className="mt-1">alex@tastepilot.dev · jordan@tastepilot.dev — password: tastepilot</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => {
              form.setValue('email', 'alex@tastepilot.dev');
              form.setValue('password', 'tastepilot');
            }}
          >
            Fill in Alex
          </Button>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="font-medium text-brand underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupInputSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const onSubmit = form.handleSubmit((values) =>
    signup.mutate(values, { onSuccess: () => router.replace('/profile?welcome=1') }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Your name" error={form.formState.errors.name?.message}>
        <Input autoComplete="name" {...form.register('name')} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field
        label="Password"
        hint="At least 8 characters."
        error={form.formState.errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      <FormError error={signup.error} />
      <Button type="submit" className="w-full" loading={signup.isPending}>
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ClaimForm({ onDone }: { onDone: () => void }) {
  const claim = useClaim();
  const form = useForm<ClaimInput>({
    resolver: zodResolver(claimInputSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = form.handleSubmit((values) => claim.mutate(values, { onSuccess: onDone }));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field
        label="Choose a password"
        hint="At least 8 characters."
        error={form.formState.errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      <FormError error={claim.error} />
      <Button type="submit" className="w-full" loading={claim.isPending}>
        Save my profile
      </Button>
    </form>
  );
}
