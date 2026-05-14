import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-brand-600">StudyFlow</h1>
          <p className="mt-2 text-surface-500">
            Start connecting your study habits with your wellbeing.
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-card border border-surface-200',
            },
          }}
        />
      </div>
    </div>
  );
}
