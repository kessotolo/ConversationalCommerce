import { Error, useEffect, useState } from 'react';
import { Check } from 'lucide-react';

import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import OnboardingForm from '../src/components/onboarding/OnboardingForm';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user already has a store
  useEffect(() => {
    const checkUserStore = async () => {
      if (!isAuthLoaded || !isUserLoaded || !userId) {
        return;
      }

      try {
        const response = await fetch(`/api/users/has-tenant?userId=${userId}`);
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
  }, [isAuthLoaded, isUserLoaded, userId, router]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isAuthLoaded && !userId) {
      // Redirect to sign-in page or show sign-in UI
      router.push('/sign-in');
    }
  }, [isAuthLoaded, userId, router]);

  // Show loading state
  if (isChecking || !isAuthLoaded || !isUserLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking your account...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect handled above)
  if (!userId) {
    return null;
  }

  return (
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

        {/* Onboarding form */}
        <div className="bg-white shadow rounded-lg p-6 md:p-8 max-w-3xl mx-auto">
          <OnboardingForm 
            onSubmitSuccess={() => {
              // Show success message and redirect
              alert('Your store has been created successfully!');
              router.push('/dashboard');
            }}
          />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            By creating a store, you agree to our{' '}
            <a href="/terms" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
