import React from 'react';import React from 'react';import React from 'react';import { FormEvent } from 'react';
import React from 'react';import * as React from 'react';
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function Home() {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real implementation, you'd handle this submission
        window.location.href = `/sign-up?email=${encodeURIComponent(email)}`;
    };

    return (
        <main className="min-h-screen bg-[#fdfcf7] flex flex-col">
            {/* Hero Section */}
            <section className="flex flex-col items-center justify-center px-4 pt-12 pb-10 w-full max-w-xl mx-auto">
                <div className="w-full flex flex-col items-center">
                    {/* Headline and Subheadline */}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center leading-tight mb-1">
                        Commerce, Simplified.
                    </h1>
                    <p className="text-[#6C9A8B] text-lg font-semibold text-center mb-4">Anywhere. Anytime.</p>
                    {/* Market Photo with fallback */}
                    <div className="w-full flex flex-col items-center mb-4">
                        <Image
                            src="/market-photo.jpg"
                            alt="Market sellers and customers"
                            width={320}
                            height={240}
                            className="rounded-2xl shadow-lg border border-gray-100 object-cover w-full h-[240px]"
                            priority
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = document.getElementById('market-fallback');
                                if (fallback) fallback.style.display = 'flex';
                            }}
                        />
                        <div id="market-fallback" style={{ display: 'none' }} className="w-full h-[240px] flex flex-col items-center justify-center rounded-2xl shadow-lg border border-gray-100 bg-[#f5f5f5] text-gray-400">
                            <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01.88 7.903A5.5 5.5 0 1112 6.5c.338 0 .67.03.995.086" /></svg>
                            <span className="text-sm">Market Photo Not Found</span>
                        </div>
                    </div>
                    {/* Tagline as signature statement */}
                    <p className="text-[#6C9A8B] text-base font-semibold text-center mb-6 italic">Where commerce begins with a conversation</p>
                </div>
                <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="flex-grow px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] bg-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="px-6 py-3 rounded-lg bg-[#6C9A8B] text-white font-bold text-lg shadow hover:bg-[#5d8a7b] transition-all"
                    >
                        Get Started
                    </button>
                </form>
                <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                    <Link href="#features" className="text-[#6C9A8B] font-medium underline text-sm text-center">See How It Works</Link>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <Link href="#contact" className="text-gray-500 font-medium underline text-sm text-center">Contact Sales</Link>
                </div>
            </section>

            {/* Feature Highlights */}
            <section id="features" className="bg-white rounded-t-3xl shadow-lg px-4 py-10 w-full max-w-xl mx-auto mb-8">
                <div className="flex flex-col gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Mobile-First</h3>
                            <p className="text-gray-500 text-sm">Run your business from your phone—no laptop needed.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Messaging Commerce</h3>
                            <p className="text-gray-500 text-sm">Sell where your customers chat. WhatsApp, Messenger, and more.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#A8D5BA]/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Unified Dashboard</h3>
                            <p className="text-gray-500 text-sm">Products, orders, and chats—all in one place.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="w-full max-w-xl mx-auto px-4 py-8">
                <div className="bg-[#f8faf8] rounded-xl shadow p-6 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] flex items-center justify-center text-white text-lg font-bold mb-2">JD</div>
                    <p className="text-gray-800 text-center font-medium mb-1">“I doubled my sales in just two weeks after listing my products for messaging apps.”</p>
                    <span className="text-gray-500 text-xs">Jamie D., Fashion Retailer</span>
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="w-full max-w-xl mx-auto px-4 py-6 text-center text-gray-400 text-xs">
                &copy; {new Date().getFullYear()} ConvoCommerce. All rights reserved.
            </footer>
        </main>
    )
}