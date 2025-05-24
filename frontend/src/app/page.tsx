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
        <main className="min-h-screen bg-gradient-to-b from-[#fcfcfc] to-[#f5f9f7]">
            {/* Using global Navbar from layout.tsx */}
            
            {/* Mobile-friendly metallic accent elements */}
            <div className="absolute top-20 left-0 w-32 h-32 bg-gradient-to-r from-[#6C9A8B]/10 to-[#A8D5BA]/10 rounded-full blur-2xl -z-10"></div>
            <div className="absolute top-40 right-0 w-48 h-48 bg-gradient-to-l from-[#6C9A8B]/10 to-[#A8D5BA]/10 rounded-full blur-3xl -z-10"></div>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 md:pt-20">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] text-transparent bg-clip-text leading-tight" style={{ letterSpacing: '-1px' }}>
                            Where Commerce<br />Begins With Conversation
                        </h1>
                        <p className="mt-6 text-lg text-gray-600 max-w-xl">
                            The all-in-one platform that turns messaging into money. Run your entire business from your phone—anywhere, anytime.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-4 max-w-lg">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] focus:border-transparent"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 rounded-lg bg-[#6C9A8B] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:bg-[#5d8a7b] transform hover:translate-y-[-2px] transition-all duration-200 whitespace-nowrap"
                            >
                                GET STARTED
                            </button>
                        </form>
                        
                        <div className="mt-6 text-sm text-gray-500">
                            Free signup. No card required. Start selling instantly.
                        </div>
                    </div>
                    
                    <div className="order-1 md:order-2 flex justify-center">
                        {/* This would be your hero image */}
                        <div className="relative w-full max-w-md h-[400px] rounded-xl bg-gradient-to-tr from-[#A8D5BA]/20 to-[#6C9A8B]/20 flex items-center justify-center">
                            <div className="absolute -top-3 -right-3 w-40 h-40 bg-[#A8D5BA]/30 rounded-full blur-2xl"></div>
                            <div className="absolute -bottom-5 -left-5 w-40 h-40 bg-[#6C9A8B]/30 rounded-full blur-2xl"></div>
                            
                            <div className="relative z-10 shadow-2xl rounded-xl border border-white/20 bg-white/90 backdrop-blur-sm p-3 transform -rotate-3">
                                <div className="p-2 border-b border-gray-200">
                                    <div className="w-20 h-5 rounded bg-[#6C9A8B]/20"></div>
                                </div>
                                <div className="h-[400px] w-[220px] flex items-center justify-center">
                                    <span className="text-sm text-gray-400">WhatsApp Store Preview</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Highlights */}
            <section className="bg-white py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#6C9A8B] via-[#88b2a3] to-[#A8D5BA] text-transparent bg-clip-text animate-gradient">Why businesses choose us</h2>
                        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                            Built for modern businesses selling through messaging apps and social channels
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6C9A8B]/40 to-[#A8D5BA]/40 flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] text-transparent bg-clip-text mb-3">Mobile-First Everything</h3>
                            <p className="text-gray-600">Run your entire business from your phone—no computer needed.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6C9A8B]/40 to-[#A8D5BA]/40 flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] text-transparent bg-clip-text mb-3">Messaging Commerce</h3>
                            <p className="text-gray-600">Sell right where your customers already chat with automated replies.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6C9A8B]/40 to-[#A8D5BA]/40 flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#6C9A8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] text-transparent bg-clip-text mb-3">One Dashboard for All</h3>
                            <p className="text-gray-600">Manage products, conversations, and orders from a single hub.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-20 bg-gradient-to-b from-[#f9fdf9] to-white overflow-hidden relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#6C9A8B]/5 to-[#A8D5BA]/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#6C9A8B]/5 to-[#A8D5BA]/5 rounded-full blur-3xl -z-10"></div>
                
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-block py-2 px-4 rounded-full bg-gradient-to-r from-[#6C9A8B]/20 to-[#A8D5BA]/20 backdrop-blur-sm text-[#6C9A8B] font-medium text-sm mb-8">
                        Trusted by businesses worldwide
                    </div>
                    
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#6C9A8B]/10 to-[#A8D5BA]/10 rounded-lg blur-md"></div>
                        <h2 className="relative p-6 text-3xl font-bold text-gray-800 mb-12 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-[#A8D5BA]/20">
                            "I doubled my sales in just two weeks after listing my products for messaging apps."
                        </h2>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#6C9A8B] to-[#A8D5BA] mb-4 flex items-center justify-center text-white text-lg font-bold">
                            JD
                        </div>
                        <p className="font-medium text-gray-900">Jamie D.</p>
                        <p className="text-gray-600">Fashion Retailer</p>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="bg-white py-20 px-4 sm:px-6 lg:px-0 overflow-hidden relative">
                {/* Decorative elements */}
                <div className="absolute top-20 left-10 w-64 h-64 bg-[#A8D5BA]/10 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#6C9A8B]/10 rounded-full blur-3xl -z-10"></div>
                
                <div className="max-w-4xl mx-auto">
                    <div className="relative group">
                        {/* Metallic border effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#6C9A8B] via-[#A8D5BA] to-[#6C9A8B] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-300"></div>
                        
                        <div className="relative bg-gradient-to-r from-[#6C9A8B] to-[#75a596] rounded-2xl p-8 md:p-12 shadow-xl overflow-hidden">
                            {/* Fun geometric shapes */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full translate-x-20 -translate-y-20"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-x-20 translate-y-20"></div>
                            
                            <div className="relative z-10 text-center">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 drop-shadow-sm">Start Selling Through Conversation</h2>
                                <p className="text-[#E0F0E5] mb-8 max-w-2xl mx-auto">
                                    Join thousands of businesses growing through messaging platforms worldwide.
                                </p>
                                
                                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="w-full sm:flex-grow px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/95"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white text-[#6C9A8B] font-bold text-lg shadow-lg hover:shadow-xl hover:bg-white/90 transform hover:-translate-y-1 transition-all duration-200 whitespace-nowrap"
                                    >
                                        START NOW
                                    </button>
                                </form>
                                
                                <p className="mt-4 text-[#E0F0E5] text-sm">
                                    Free signup. Start selling right away.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="bg-white pt-12 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <h3 className="text-lg font-bold text-[#6C9A8B] mb-4">ConvoCommerce</h3>
                            <p className="text-gray-600 text-sm">
                                The all-in-one platform for conversational commerce in Africa.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-4">Product</h3>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Features</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Pricing</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">WhatsApp Integration</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-4">Resources</h3>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Blog</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Help Center</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Guides</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-4">Company</h3>
                            <ul className="space-y-3 text-sm">
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">About</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Contact</Link></li>
                                <li><Link href="#" className="text-gray-500 hover:text-[#6C9A8B]">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} ConvoCommerce. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    )
}