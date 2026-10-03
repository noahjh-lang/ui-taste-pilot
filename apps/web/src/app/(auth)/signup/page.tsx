import { SignupForm } from '@/features/auth';

export const metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>
      <SignupForm />
    </>
  );
}
