import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export const metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
