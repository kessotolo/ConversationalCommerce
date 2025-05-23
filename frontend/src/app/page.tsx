'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';

function Hero() {
    return (
        <section className="relative bg-ivory min-h-[60vh] flex flex-col justify-center items-center px-4 py-16 sm:py-24">
            <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center gap-6">
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-2 text-charcoal-dark tracking-tight">
                    Commerce, Unlocked
                </h1>
                <p className="text-lg sm:text-xl mb-4 text-charcoal-medium">
                    The modern platform for creators, brands, and entrepreneurs. Sell, connect, and grow—no limits.
                </p>
                <Link
                    href="/sign-up"
                    className="bg-green-sage text-charcoal-dark px-8 py-3 rounded-full font-semibold shadow hover:bg-green-laurel transition-colors text-lg w-full sm:w-auto focus:ring-2 focus:ring-green-laurel"
                >
                    Create Your Store
                </Link>
            </div>
        </section>
    );
}

function WhyChooseUs() {
    const features = [
        {
            icon: "🚀",
            title: "Launch Instantly",
            description: "No code, no hassle. Go live in minutes."
        },
        {
            icon: "🌐",
            title: "Global by Default",
            description: "Multi-currency, mobile-first, and built to scale."
        },
        {
            icon: "💬",
            title: "Connect Deeply",
            description: "Chat, sell, and support—all in one place."
        },
    ];
    return (
        <section className="bg-white py-12 px-4">
            <div className="max-w-3xl mx-auto rounded-2xl shadow p-6 sm:p-10 flex flex-col gap-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-charcoal-dark">Why Choose Us?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center gap-2">
                            <div className="text-3xl mb-1 text-green-sage">{feature.icon}</div>
                            <h3 className="text-lg font-semibold text-charcoal-dark">{feature.title}</h3>
                            <p className="text-charcoal-medium text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function StorySection() {
    return (
        <section className="bg-ivory py-12 px-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-6 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-charcoal-dark mb-2">Commerce, Simplified</h2>
                <p className="text-charcoal-medium text-base">
                    Whether you're selling products, services, or content, our platform helps you reach more customers and grow—no hassle, just results.
                </p>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <>
            <SignedIn>
                <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24 bg-ivory">
                    <div className="w-full max-w-4xl">
                        <h1 className="text-4xl font-bold mb-8 text-center text-charcoal-dark">Welcome to Your Commerce Hub</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link
                                href="/dashboard"
                                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-medium"
                            >
                                <h2 className="text-2xl font-semibold mb-2 text-green-sage">Dashboard</h2>
                                <p className="text-charcoal-medium">Manage your products and orders</p>
                            </Link>
                            <Link
                                href="/storefront"
                                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-medium"
                            >
                                <h2 className="text-2xl font-semibold mb-2 text-green-sage">Storefront</h2>
                                <p className="text-charcoal-medium">View your public store</p>
                            </Link>
                        </div>
                    </div>
                </main>
            </SignedIn>
            <SignedOut>
                <main className="min-h-screen flex flex-col bg-ivory">
                    <Hero />
                    <WhyChooseUs />
                    <StorySection />
                </main>
            </SignedOut>
        </>
    );
}