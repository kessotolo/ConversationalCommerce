'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, LayoutDashboard, CheckCircle, Twitter, Linkedin } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();

  // Chat animation state
  const [bubbleStep, setBubbleStep] = useState(0);
  useEffect(() => {
    setBubbleStep(0);
    const timers = [
      setTimeout(() => setBubbleStep(1), 700),
      setTimeout(() => setBubbleStep(2), 1400),
      setTimeout(() => setBubbleStep(3), 2100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Redirect signed-in users to appropriate page
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check if user has completed onboarding by checking for tenant
      const checkUserOnboarding = async () => {
        try {
          const response = await fetch(`/api/v1/users/has-tenant?user_id=${user.id}`);
          if (response.ok) {
            const { hasTenant } = await response.json();

            // If user has a tenant, go to dashboard; otherwise, go to store setup
            if (hasTenant) {
              router.push('/dashboard' as Route);
            } else {
              router.push('/store-setup' as Route);
            }
          } else {
            // If API call fails, redirect to store setup as fallback
            router.push('/store-setup' as Route);
          }
        } catch (error) {
          console.error('Error checking user onboarding status:', error);
          // If there's an error, redirect to store setup as fallback
          router.push('/store-setup' as Route);
        }
      };

      checkUserOnboarding();
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col font-sans">
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-accent text-section px-4 py-2 rounded z-50" tabIndex={0} data-testid="skip-to-content">Skip to main content</a>
      {/* Hero Section */}
      <section id="main-content" className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 w-full max-w-5xl mx-auto" tabIndex={-1} aria-label="Hero Section" data-testid="hero-section">
        <div className="flex flex-col items-center w-full gap-2 mb-8 min-h-[220px]">
          {/* Simulated Chat Bubbles with Animation */}
          <div className="w-full flex flex-col items-center gap-2 max-w-xs">
            {/* Typing indicator */}
            {bubbleStep === 0 && (
              <div className="bg-section border border-muted rounded-2xl px-4 py-2 shadow-sm w-full text-left text-muted text-base font-medium flex items-center fade-in" aria-label="Chat typing" data-testid="hero-chat-typing">
                <span className="inline-block animate-pulse">...</span>
              </div>
            )}
            {/* Buyer: Still available? */}
            {bubbleStep >= 1 && (
              <div className="bg-section border border-muted rounded-2xl px-4 py-2 shadow-sm w-full text-left text-primary text-base font-medium fade-in" aria-label="Chat bubble 1" data-testid="hero-chat-bubble-1" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                Still available?
              </div>
            )}
            {/* Seller: Can I pay with bank transfer? */}
            {bubbleStep >= 2 && (
              <div className="bg-accent text-section border border-accent rounded-2xl px-4 py-2 shadow-sm w-full text-right font-medium fade-in" aria-label="Chat bubble 2" data-testid="hero-chat-bubble-2" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                Can I pay with bank transfer?
              </div>
            )}
            {/* Buyer: How fast is delivery? */}
            {bubbleStep >= 3 && (
              <div className="bg-section border border-muted rounded-2xl px-4 py-2 shadow-sm w-full text-left text-primary text-base font-medium fade-in" aria-label="Chat bubble 3" data-testid="hero-chat-bubble-3" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                How fast is delivery?
              </div>
            )}
          </div>
          {/* Dashboard Card */}
          <div className="card-outline relative z-10 p-4 max-w-xs w-full shadow-lg mt-4" aria-label="Dashboard mockup" data-testid="hero-dashboard-mockup">
            <span className="block text-accent font-semibold text-sm mb-1">New Order • Paid $27.90</span>
            <span className="block text-muted text-xs">Order #12345</span>
          </div>
          {/* Message preview animation (typing dots) - mobile only */}
          <div className="absolute left-1/2 -bottom-8 transform -translate-x-1/2 flex gap-1 items-center opacity-80 md:hidden">
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
        <h1 className="headline text-5xl sm:text-6xl text-primary text-center leading-tight mb-8 tracking-tight drop-shadow-lg">
          The storefront for sellers who close deals in DMs.
        </h1>
        <p className="tagline-hero text-center fade-in" data-testid="hero-tagline-hero">
          enwhe.io — where commerce begins with conversation.
        </p>
        <p className="text-primary text-lg sm:text-xl section-title text-center mb-10 max-w-2xl mx-auto">
          <span className="hidden md:inline">Sell from WhatsApp, Instagram, or anywhere you chat — Enwhe.io turns conversations into commerce.</span>
          <span className="inline md:hidden">Whether you're selling from WhatsApp in Lagos or Instagram in Manila — Enwhe.io helps you turn conversations into commerce.</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mb-6">
          <button
            type="button"
            className="px-8 py-3 rounded-full bg-highlight text-primary font-semibold text-lg shadow cta-animate transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 cursor-pointer relative overflow-hidden"
            onClick={() => router.push('/auth/sign-up' as Route)}
            aria-label="Launch Your Store Free"
            data-testid="hero-primary-cta"
          >
            Launch Your Store Free
          </button>
          <button
            type="button"
            className="px-8 py-3 rounded-full border-2 border-accent text-accent font-semibold text-lg bg-section hover:bg-accent hover:text-section cta-animate transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 cursor-pointer hidden sm:inline"
            onClick={() => router.push('/auth/sign-in' as Route)}
            aria-label="Already selling? Log in"
            data-testid="hero-login-cta"
          >
            Already selling? Log in
          </button>
        </div>
        {/* Mobile login link */}
        <div className="sm:hidden w-full flex justify-center mb-4">
          <button
            type="button"
            className="text-accent underline text-sm font-medium hover:text-highlight transition-colors"
            onClick={() => router.push('/auth/sign-in' as Route)}
            aria-label="Already selling? Log in"
            data-testid="hero-login-link"
          >
            Already selling? Log in
          </button>
        </div>
      </section>

      {/* Core Benefits Section */}
      <section className="w-full max-w-3xl mx-auto px-4 py-14 fade-in">
        <h2 className="section-title text-2xl text-primary text-center mb-10">Built for how modern sellers actually sell.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="card-outline flex flex-col items-center text-center p-6 transition-transform duration-200 hover:scale-105 hover:shadow-xl group" tabIndex={0} aria-label="Launch in Minutes" data-testid="feature-launch">
            <div className="w-14 h-14 rounded-full border-2 border-highlight flex items-center justify-center mb-3 bg-section group-hover:bg-background transition-colors" data-testid="feature-launch-icon">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" aria-hidden="true"><circle cx="14" cy="14" r="12" /></svg>
            </div>
            <h3 className="text-primary font-semibold mb-1">Launch in Minutes</h3>
            <p className="text-muted text-sm">Skip the tech. Upload a product and go live fast.</p>
          </div>
          <div className="flex items-center justify-center" aria-hidden="true">
            <div className="h-16 w-px bg-background sm:bg-gradient-to-b sm:from-background sm:via-muted sm:to-background opacity-60 mx-auto" />
          </div>
          <div className="card-outline flex flex-col items-center text-center p-6 transition-transform duration-200 hover:scale-105 hover:shadow-xl group" tabIndex={0} aria-label="Sell Where You Chat" data-testid="feature-chat">
            <div className="w-14 h-14 rounded-full border-2 border-accent flex items-center justify-center mb-3 bg-section group-hover:bg-background transition-colors" data-testid="feature-chat-icon">
              <MessageCircle className="w-7 h-7 text-accent" strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 className="text-primary font-semibold mb-1">Sell Where You Chat</h3>
            <div className="flex justify-center gap-3 mb-2 mt-1">
              {/* Social icons: WhatsApp, IG, Telegram */}
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" className="text-muted" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.21-.242-.58-.487-.501-.669-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.077 4.372.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" stroke="currentColor" strokeWidth="2" /></svg>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" className="text-muted" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" className="text-muted" aria-hidden="true"><path d="M21 3L9.218 20.812a1 1 0 01-1.7-1.06l1.6-4.8a1 1 0 01.6-.6l4.8-1.6a1 1 0 011.06 1.7L3 21" stroke="currentColor" strokeWidth="2" /></svg>
            </div>
            <p className="text-muted text-sm">WhatsApp, IG DMs, Messenger, Telegram — your link works everywhere.</p>
          </div>
          <div className="flex items-center justify-center" aria-hidden="true">
            <div className="h-16 w-px bg-background sm:bg-gradient-to-b sm:from-background sm:via-muted sm:to-background opacity-60 mx-auto" />
          </div>
          <div className="card-outline flex flex-col items-center text-center p-6 transition-transform duration-200 hover:scale-105 hover:shadow-xl group" tabIndex={0} aria-label="Track Everything in One Place" data-testid="feature-track">
            <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center mb-3 bg-section group-hover:bg-background transition-colors" data-testid="feature-track-icon">
              <LayoutDashboard className="w-7 h-7 text-primary" strokeWidth={2} aria-hidden="true" />
            </div>
            <h3 className="text-primary font-semibold mb-1">Track Everything in One Place</h3>
            <p className="text-muted text-sm">Orders, inventory, payments — beautifully organized.</p>
          </div>
        </div>
        <p className="text-center text-accent font-normal mt-10 fade-in">Enwhe.io — where commerce begins with conversation.</p>
      </section>

      {/* Quick Start Section */}
      <section id="quickstart" className="w-full max-w-2xl mx-auto px-4 py-14 fade-in">
        <div className="card-outline bg-section p-8">
          <h2 className="section-title text-2xl text-primary text-center mb-8">Start selling in 3 simple steps</h2>
          <ol className="space-y-6 mb-8">
            <li className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <span className="text-highlight font-bold text-xl">1.</span>
              <span className="text-primary">Create your store – It's free to start.</span>
            </li>
            <li className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <span className="text-highlight font-bold text-xl">2.</span>
              <span className="text-primary">Add your products and brand – Customize your storefront.</span>
            </li>
            <li className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <span className="text-highlight font-bold text-xl">3.</span>
              <span className="text-primary">Share your link in chats – Accept orders and track everything in one place.</span>
            </li>
          </ol>
          <button
            type="button"
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-highlight text-primary font-semibold text-lg shadow hover:bg-accent hover:text-section border-2 border-highlight transition-all duration-200 mb-2 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 relative overflow-hidden ripple"
            onClick={() => router.push('/auth/sign-up' as Route)}
            aria-label="Start Free — No Hassle"
            data-testid="quickstart-cta"
          >
            📦 Start Free — No Hassle
          </button>
          <p className="text-center text-muted text-sm mt-2">No credit card required. Mobile-first from day one.</p>
        </div>
      </section>

      {/* Trust Section */}
      <section className="w-full max-w-2xl mx-auto px-4 py-14 fade-in">
        <h2 className="section-title text-2xl text-primary text-center mb-8">Trusted by sellers across communities and continents</h2>
        <div className="space-y-8">
          <div className="card-outline flex flex-col items-center p-6 shadow-md fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }} tabIndex={0} aria-label="Testimonial Kemi O." data-testid="testimonial-kemi">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 text-accent font-bold text-lg border-2 border-accent">KO</div>
            <blockquote className="italic text-gray-700 text-center mb-2">"My audience lives on WhatsApp. Enwhe.io lets me sell without ever leaving the chat."</blockquote>
            <footer className="text-muted text-sm">— Kemi O., Nigeria</footer>
          </div>
          <div className="w-full flex items-center justify-center" aria-hidden="true">
            <div className="w-24 h-px bg-gradient-to-r from-background via-muted to-background opacity-40" />
          </div>
          <div className="card-outline flex flex-col items-center p-6 shadow-md fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }} tabIndex={0} aria-label="Testimonial Tega E." data-testid="testimonial-tega">
            <div className="w-12 h-12 rounded-full bg-highlight/10 flex items-center justify-center mb-3 text-highlight font-bold text-lg border-2 border-highlight">TE</div>
            <blockquote className="italic text-gray-700 text-center mb-2">"This platform gets how we actually do business. I don't need a website — I need results. And I'm getting them."</blockquote>
            <footer className="text-muted text-sm">— Tega E., Brazil</footer>
          </div>
        </div>
        <p className="text-center text-primary mt-8 fade-in">Enwhe.io is used by creators, merchants, and hustlers from Nairobi to New York.</p>
      </section>

      {/* Founder/Ethos Section */}
      <section className="w-full max-w-2xl mx-auto px-4 py-14 fade-in">
        <div className="card-outline border-2 border-accent rounded-2xl p-8 shadow-md flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="text-accent" aria-hidden="true"><path d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828a4 4 0 01-1.414.94l-3.053 1.221a.5.5 0 01-.65-.65l1.22-3.053a4 4 0 01.94-1.414z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="uppercase text-muted text-xs font-semibold tracking-widest">From the Founder</span>
          </div>
          <blockquote className="italic text-gray-700 text-center mb-2 section-title">"I built Enwhe.io after watching brilliant sellers do everything manually — flipping between DMs, notes, and screenshots just to close a sale. We've taken that chaotic energy and turned it into clean, powerful commerce — for anyone, anywhere."</blockquote>
          <footer className="text-muted text-sm mt-2">– Kesena Otolo, Founder</footer>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-10 text-muted text-sm flex flex-col gap-6 border-t border-gray-100 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
          <div className="flex flex-col gap-2 items-center">
            <div className="flex flex-wrap justify-center gap-4 mb-2">
              <a href="#features" className="hover:text-accent transition-colors">Features</a>
              <a href="#" className="hover:text-accent transition-colors">Pricing</a>
              <a href="#" className="hover:text-accent transition-colors">Guides</a>
              <a href="#" className="hover:text-accent transition-colors">WhatsApp Playbook</a>
              <a href="#" className="hover:text-accent transition-colors">FAQs</a>
              <a href="#" className="hover:text-accent transition-colors">Referral</a>
              <a href="#" className="hover:text-accent transition-colors">About</a>
              <a href="#" className="hover:text-accent transition-colors">Privacy</a>
              <a href="#" className="hover:text-accent transition-colors">Terms</a>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <div className="flex justify-center gap-4 mb-2">
              <a href="#" aria-label="Instagram" className="hover:text-accent transition-colors focus:outline-none" data-testid="footer-instagram-link">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
              </a>
              <a href="#" aria-label="X" className="hover:text-accent transition-colors focus:outline-none" data-testid="footer-x-link"><Twitter className="w-5 h-5" aria-hidden="true" /></a>
              <a href="#" aria-label="LinkedIn" className="hover:text-accent transition-colors focus:outline-none" data-testid="footer-linkedin-link"><Linkedin className="w-5 h-5" aria-hidden="true" /></a>
              <a href="#" aria-label="WhatsApp" className="hover:text-accent transition-colors focus:outline-none" data-testid="footer-whatsapp-link">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.21-.242-.58-.487-.501-.669-.51-.173-.007-.372-.009-.571-.009-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.077 4.372.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" stroke="currentColor" strokeWidth="2" /></svg>
              </a>
            </div>
          </div>
        </div>
        <p className="text-center tagline-footer fade-in" data-testid="footer-tagline">
          enwhe.io — where commerce begins with conversation.
        </p>
        <div className="text-center text-muted mt-2">© {new Date().getFullYear()} enwhe.io</div>
      </footer>


    </main>
  );
}
