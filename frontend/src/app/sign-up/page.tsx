'use client';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/store-setup" />
      </div>
    </div>
  );
}
