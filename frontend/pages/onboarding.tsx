import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import OnboardingForm from '../src/components/onboarding/OnboardingForm';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user already has a store
  useEffect(() => {
    const checkUserStore = async () => {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch(`/api/users/has-tenant?userId=${user.id}`);
        if (response.ok) {
          const { hasTenant } = await response.json();
          setHasStore(hasTenant);
          
          // If user already has a store, redirect to dashboard
          if (hasTenant) {
            router.push('/dashboard');
          }
        } else {
          console.error('Error checking user store');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkUserStore();
  }, [isLoaded, user, router]);

  // Show loading state
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <SignedIn>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Welcome to Conversational Commerce
            </h1>
            <p className="mt-3 text-xl text-gray-500">
              Let's set up your store in just a few steps
            </p>
          </div>
          
          <OnboardingForm 
            onSubmitSuccess={() => {
              // Show success message and redirect
              alert('Your store has been created successfully!');
              router.push('/dashboard');
            }}
          />

          <div className="mt-10 text-center text-gray-500 text-sm">
            <p>
              By creating a store, you agree to our{' '}
              <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </SignedIn>
    
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  );
}
