import React from 'react';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFF0] px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 mt-12">
        <SignIn appearance={{ elements: { card: 'shadow-none' } }} />
      </div>
    </main>
  );
}
