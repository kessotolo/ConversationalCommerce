import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFF0] px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 mt-12">
                <SignUp appearance={{ elements: { card: 'shadow-none' } }} />
            </div>
        </main>
    );
}