'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, LayoutDashboard, CheckCircle, Twitter, Linkedin } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();
  const [showDashboardPrompt, setShowDashboardPrompt] = useState(false);
  const [hasTenant, setHasTenant] = useState<boolean | null>(null);

  // Chat animation state with useRef to prevent memory leaks
  const [bubbleStep, setBubbleStep] = useState(0);
  const timersRef = React.useRef<NodeJS.Timeout[]>([]);
  
  // Clean up animation with better memory management
  useEffect(() => {
    // Reset animation state
    setBubbleStep(0);
    
    // Clear any existing timers
    if (timersRef.current.length > 0) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    }
    
    // Set up new animation sequence with properly tracked timers
    timersRef.current = [
      setTimeout(() => setBubbleStep(1), 700),
      setTimeout(() => setBubbleStep(2), 1400),
      setTimeout(() => setBubbleStep(3), 2100),
    ];
    
    // Cleanup function will run on unmount or when dependencies change
    return () => {
      if (timersRef.current.length > 0) {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
      }
    };
  }, []);

  // Check user's onboarding status and automatically redirect authenticated users
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const checkUserOnboarding = async () => {
        try {
          const response = await fetch(`/api/v1/users/has-tenant?user_id=${user.id}`);
          if (response.ok) {
            const { hasTenant: userHasTenant } = await response.json();
            setHasTenant(userHasTenant);
            
            // Automatically redirect to appropriate location
            if (userHasTenant) {
              router.push('/dashboard');
            } else {
              router.push('/store-setup');
            }
          }
        } catch (error) {
          // Handle error silently without console logging in production
          // Use a proper error tracking system in production instead of console.error
          if (process.env.NODE_ENV === 'development') {
            // Only log in development
            console.error('Error checking user onboarding status:', error);
          }
          // Show prompt as fallback if we can't determine tenant status
          setShowDashboardPrompt(true);
        }
      };

      checkUserOnboarding();
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Function to handle going to dashboard/store-setup
  const handleGoToDashboard = () => {
    if (hasTenant) {
      router.push('/dashboard' as Route);
    } else {
      router.push('/store-setup' as Route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Dashboard prompt only for signed-in users with existing tenants */}
      {showDashboardPrompt && isSignedIn && hasTenant && (
        <div 
          className="bg-blue-600 text-white px-4 py-3 text-center relative" 
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">
              Welcome back! Ready to manage your store?
            </span>
            <button
              onClick={handleGoToDashboard}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
          <button
            onClick={() => setShowDashboardPrompt(false)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded-full w-6 h-6 flex items-center justify-center"
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {/* Header with improved accessibility */}
      <header className="bg-white shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <a 
                href="/" 
                className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded-md"
                aria-label="ConversationalCommerce home page"
              >
                <MessageCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
                <span className="text-xl font-bold text-gray-900">enwhe.io</span>
              </a>
            </div>
            <nav>
              <ul className="flex items-center space-x-4">
                {/* Always show auth buttons - removed conditional that could be causing them to not display */}
                <li>
                  <button
                    onClick={() => router.push('/auth/sign-in' as Route)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    aria-label="Sign in to your account"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push('/auth/sign-up' as Route)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                    aria-label="Create an account and start selling"
                  >
                    Start Selling
                  </button>
                </li>
                {isSignedIn && hasTenant && (
                  <li>
                    <button
                      onClick={() => router.push('/dashboard' as Route)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 flex items-center gap-2"
                      aria-label="Go to your dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      <span>Dashboard</span>
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Rest of your existing homepage content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Sell Anywhere, <br />
            <span className="text-green-600">Chat Everywhere</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Turn WhatsApp, Instagram, and TikTok into your personal storefront.
            Start conversations, build relationships, and close sales - all in the chat apps your customers already use.
          </p>

          {/* Chat Animation Demo with improved accessibility */}
          <div 
            className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto mb-8" 
            aria-label="Chat conversation demo"
            role="region"
          >
            <div className="text-left space-y-3">
              <div className="flex justify-end">
                <div 
                  className="bg-green-500 text-white rounded-lg px-3 py-2 max-w-xs" 
                  aria-label="Customer message"
                >
                  Hi! Do you have this in blue? 💙
                </div>
              </div>
              <div 
                className="flex justify-start" 
                aria-hidden={bubbleStep < 1}
                style={{
                  opacity: bubbleStep >= 1 ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                  height: bubbleStep >= 1 ? 'auto' : 0,
                  overflow: 'hidden'
                }}
              >
                <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 max-w-xs" aria-label="Seller response">
                  Yes! Here's the blue version with 20% off today only 🎉
                </div>
              </div>
              <div 
                className="flex justify-end" 
                aria-hidden={bubbleStep < 2}
                style={{
                  opacity: bubbleStep >= 2 ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                  height: bubbleStep >= 2 ? 'auto' : 0,
                  overflow: 'hidden'
                }}
              >
                <div className="bg-green-500 text-white rounded-lg px-3 py-2 max-w-xs" aria-label="Customer order">
                  Perfect! I'll take 2 please
                </div>
              </div>
              <div 
                className="flex justify-start" 
                aria-hidden={bubbleStep < 3}
                style={{
                  opacity: bubbleStep >= 3 ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                  height: bubbleStep >= 3 ? 'auto' : 0,
                  overflow: 'hidden'
                }}
              >
                <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 max-w-xs" aria-label="Order confirmation">
                  <CheckCircle 
                    className="h-4 w-4 text-green-500 inline mr-1" 
                    aria-hidden="true" 
                  />
                  <span>Order confirmed! Delivery in 2 days</span>
                </div>
              </div>
            </div>
          </div>

          {!isSignedIn && isLoaded && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/auth/sign-up' as Route)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                aria-label="Create your store for free"
              >
                Start Your Store Free
              </button>
              <button
                onClick={() => router.push('/demo' as Route)}
                className="border border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                aria-label="View a demonstration of our platform"
              >
                See Demo
              </button>
            </div>
          )}
        </div>

        {/* Features Grid with improved accessibility */}
        <section aria-labelledby="features-heading" id="features" className="mb-16">
          <h2 id="features-heading" className="sr-only">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white bg-opacity-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-12 w-12 text-green-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chat Commerce</h3>
              <p className="text-gray-600">
                Sell directly through WhatsApp, Instagram DM, and TikTok messages
              </p>
            </div>
            <div className="text-center p-6 bg-white bg-opacity-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-blue-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="h-12 w-12 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unified Dashboard</h3>
              <p className="text-gray-600">
                Manage orders, inventory, and customers from one simple dashboard
              </p>
            </div>
            <div className="text-center p-6 bg-white bg-opacity-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-purple-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Checkout</h3>
              <p className="text-gray-600">
                Customers buy with one click - no app downloads or account creation needed
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section with improved accessibility */}
        <section aria-labelledby="cta-heading" className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 id="cta-heading" className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Sales?
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Join thousands of sellers already using enwhe.io
          </p>
          {!isSignedIn && isLoaded && (
            <button
              onClick={() => router.push('/auth/sign-up' as Route)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
              aria-label="Sign up for a free account"
            >
              Get Started Free
            </button>
          )}
        </section>
      </main>

      {/* Footer with improved accessibility */}
      <footer className="bg-gray-900 text-white py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <a 
                  href="/" 
                  className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-white rounded-md"
                  aria-label="enwhe.io home page"
                >
                  <MessageCircle className="h-6 w-6" aria-hidden="true" />
                  <span className="font-bold">enwhe.io</span>
                </a>
              </div>
              <p className="text-gray-400">
                The future of commerce is conversational.
              </p>
            </div>
            <nav aria-labelledby="product-heading">
              <h3 id="product-heading" className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a 
                    href="#features" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a 
                    href="#pricing" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a 
                    href="#integrations" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Integrations
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="support-heading">
              <h3 id="support-heading" className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a 
                    href="#help" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a 
                    href="#contact" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a 
                    href="#status" 
                    className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:underline focus:text-white rounded px-1"
                  >
                    Status
                  </a>
                </li>
              </ul>
            </nav>
            <div>
              <h3 id="connect-heading" className="font-semibold mb-3">Connect</h3>
              <div className="flex space-x-4">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1"
                  aria-label="Follow us on Twitter"
                >
                  <Twitter className="h-5 w-5 text-gray-400 hover:text-white" aria-hidden="true" />
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1"
                  aria-label="Connect with us on LinkedIn"
                >
                  <Linkedin className="h-5 w-5 text-gray-400 hover:text-white" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 enwhe.io. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
