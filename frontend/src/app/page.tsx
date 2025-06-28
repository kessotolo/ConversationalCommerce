'use client';

import { useUser, SignIn, SignUp } from '@clerk/nextjs';
import {
  ArrowDown,
  MessageCircle,
  Smartphone,
  LayoutDashboard,
  Star,
  Twitter,
  Linkedin,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [modal, setModal] = useState<'login' | 'signup' | null>(null);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    // Optionally, show a loading spinner or nothing while redirecting
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-[#F5F9F7] to-[#A8D5BA]/20 flex flex-col font-sans">
      {/* Modal for Login/Signup */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 relative w-full max-w-md mx-auto animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setModal(null)}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            {modal === 'login' ? (
              <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
            ) : (
              <SignUp routing="hash" fallbackRedirectUrl="/store-setup" />
            )}
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 w-full max-w-2xl mx-auto">
        {/* Gradient background blob */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[400px] bg-gradient-to-tr from-[#6C9A8B] via-[#A8D5BA] to-white opacity-30 rounded-full blur-3xl" />
        </div>
        <h1
          className="text-5xl sm:text-6xl font-extrabold text-gray-900 text-center leading-tight mb-4 tracking-tight drop-shadow-lg"
          style={{ fontFamily: 'Inter, DM Sans, Poppins, sans-serif' }}
        >
          Welcome to <span className="text-[#6C9A8B]">enwhe.io</span>
        </h1>
        <p className="text-[#6C9A8B] text-xl font-semibold text-center mb-6 tracking-wide">
          Anywhere. Anytime. <span className="text-[#FFD700]">|</span> For everyone.
        </p>
        <p className="text-gray-500 text-lg text-center mb-10 italic max-w-md">
          Where commerce begins with a conversation.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setModal('signup');
          }}
          className="w-full flex flex-col sm:flex-row gap-3 mb-8"
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-grow px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8D5BA] bg-white text-gray-900 placeholder-gray-400 shadow-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ fontFamily: 'Inter, DM Sans, Poppins, sans-serif' }}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-[#6C9A8B] text-white font-bold text-lg shadow hover:bg-[#FFD700] hover:text-[#6C9A8B] border-2 border-[#FFD700] transition-all duration-200"
            style={{ fontFamily: 'Inter, DM Sans, Poppins, sans-serif' }}
          >
            Get Started
          </button>
        </form>
        <div className="flex flex-col sm:flex-row gap-2 w-full justify-center mb-6">
          <button
            onClick={() => setModal('login')}
            className="text-[#6C9A8B] font-medium underline text-sm text-center hover:text-[#FFD700] transition-colors"
          >
            Login
          </button>
          <span className="hidden sm:inline text-gray-300">|</span>
          <button
            onClick={() => setModal('signup')}
            className="text-gray-500 font-medium underline text-sm text-center hover:text-[#6C9A8B] transition-colors"
          >
            Sign Up
          </button>
        </div>
        {/* Animated scroll-down indicator */}
        <div className="flex flex-col items-center mt-6 animate-bounce">
          <ArrowDown className="w-7 h-7 text-[#A8D5BA]" />
        </div>
      </section>

      {/* Feature Grid */}
      <section
        id="features"
        className="w-full max-w-3xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center mb-3 border-2 border-[#FFD700]">
            <Smartphone className="w-7 h-7 text-[#6C9A8B]" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Mobile-First</h3>
          <p className="text-gray-500 text-sm">
            Run your business from your phone—no laptop needed.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center mb-3 border-2 border-[#FFD700]">
            <MessageCircle className="w-7 h-7 text-[#6C9A8B]" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Messaging Commerce</h3>
          <p className="text-gray-500 text-sm">
            Sell where your customers chat. WhatsApp, Messenger, and more.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center mb-3 border-2 border-[#FFD700]">
            <LayoutDashboard className="w-7 h-7 text-[#6C9A8B]" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Unified Dashboard</h3>
          <p className="text-gray-500 text-sm">Products, orders, and chats—all in one place.</p>
        </div>
      </section>

      {/* Social Proof / Testimonial */}
      <section className="w-full max-w-xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-tr from-white via-[#A8D5BA]/30 to-white rounded-2xl shadow-xl p-10 flex flex-col items-center border border-[#FFD700]/30">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] flex items-center justify-center text-white text-3xl font-bold mb-3 border-2 border-[#FFD700] shadow-lg">
            JD
          </div>
          <Star className="w-7 h-7 text-[#FFD700] mb-3" />
          <p className="text-gray-800 text-center font-semibold mb-2 text-lg">
            "I doubled my sales in just two weeks after listing my products for messaging apps."
          </p>
          <span className="text-gray-500 text-sm">Jamie D., Fashion Retailer</span>
        </div>
      </section>

      {/* Minimal Footer with Social Icons */}
      <footer className="w-full max-w-2xl mx-auto px-4 py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2 border-t border-gray-100 mt-8">
        <div className="flex gap-5 justify-center mb-2">
          <a
            href="https://twitter.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#6C9A8B] transition-colors"
          >
            <Twitter className="w-6 h-6" />
          </a>
          <a
            href="https://linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#6C9A8B] transition-colors"
          >
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
        <span>&copy; {new Date().getFullYear()} enwhe.io. All rights reserved.</span>
      </footer>
    </main>
  );
}
