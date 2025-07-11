'use client';

import React from 'react';
import type { ThemeLayoutSchema, PreviewDevice } from '@/modules/theme/models/theme-builder';

interface ThemePreviewProps {
    layout: ThemeLayoutSchema;
    device: PreviewDevice;
    className?: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
    layout,
    device,
    className = '',
}) => {
    // Generate CSS variables from theme
    const generateCSSVariables = () => {
        const variables = [];

        // Colors
        Object.entries(layout.colors).forEach(([key, value]) => {
            variables.push(`--color-${key}: ${value};`);
        });

        // Typography
        Object.entries(layout.typography).forEach(([key, value]) => {
            variables.push(`--font-${key}: ${value};`);
        });

        // Spacing
        Object.entries(layout.spacing).forEach(([key, value]) => {
            variables.push(`--spacing-${key}: ${value};`);
        });

        return variables.join('\n');
    };

    // Get device-specific styles
    const getDeviceStyles = () => {
        switch (device) {
            case 'mobile':
                return 'max-width: 375px; height: 667px;';
            case 'tablet':
                return 'max-width: 768px; height: 1024px;';
            case 'desktop':
                return 'max-width: 1200px; height: 800px;';
            default:
                return 'max-width: 375px; height: 667px;';
        }
    };

    // Render section based on type
    const renderSection = (section: any) => {
        if (!section.visible) return null;

        switch (section.type) {
            case 'header':
                return (
                    <header
                        key={section.id}
                        className="bg-surface border-b border-border p-4"
                        style={{ color: layout.colors.text_primary }}
                    >
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold" style={{ color: layout.colors.primary }}>
                                Store Name
                            </h1>
                            <nav className="flex items-center gap-4">
                                <a href="#" className="hover:text-primary">Home</a>
                                <a href="#" className="hover:text-primary">Products</a>
                                <a href="#" className="hover:text-primary">Contact</a>
                            </nav>
                        </div>
                    </header>
                );

            case 'hero':
                return (
                    <section
                        key={section.id}
                        className="bg-gradient-to-r from-primary to-secondary text-white p-8 text-center"
                    >
                        <h2 className="text-3xl font-bold mb-4">Welcome to Our Store</h2>
                        <p className="text-lg mb-6 opacity-90">
                            Discover amazing products at great prices
                        </p>
                        <button className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
                            Shop Now
                        </button>
                    </section>
                );

            case 'products':
                return (
                    <section key={section.id} className="p-6">
                        <h3 className="text-2xl font-bold mb-6" style={{ color: layout.colors.text_primary }}>
                            Featured Products
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-surface border border-border rounded-lg p-4"
                                    style={{ color: layout.colors.text_primary }}
                                >
                                    <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                                    <h4 className="font-semibold mb-2">Product {i}</h4>
                                    <p className="text-sm text-gray-600 mb-2">Great product description</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-primary">$99.99</span>
                                        <button className="bg-primary text-white px-4 py-2 rounded text-sm">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );

            case 'testimonials':
                return (
                    <section
                        key={section.id}
                        className="bg-gray-50 p-8"
                        style={{ backgroundColor: layout.colors.surface }}
                    >
                        <h3 className="text-2xl font-bold text-center mb-8" style={{ color: layout.colors.text_primary }}>
                            What Our Customers Say
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="bg-white p-6 rounded-lg shadow-sm"
                                    style={{ color: layout.colors.text_primary }}
                                >
                                    <p className="mb-4">"Amazing products and great service!"</p>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                                        <div>
                                            <p className="font-semibold">Customer {i}</p>
                                            <p className="text-sm text-gray-600">Verified Buyer</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );

            case 'newsletter':
                return (
                    <section
                        key={section.id}
                        className="bg-primary text-white p-8 text-center"
                    >
                        <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
                        <p className="mb-6 opacity-90">
                            Subscribe to our newsletter for the latest products and offers
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-4 py-3 rounded-lg text-gray-900"
                            />
                            <button className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
                                Subscribe
                            </button>
                        </div>
                    </section>
                );

            case 'footer':
                return (
                    <footer
                        key={section.id}
                        className="bg-gray-900 text-white p-8"
                        style={{ backgroundColor: layout.colors.text_primary }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div>
                                <h4 className="font-bold mb-4">About Us</h4>
                                <p className="text-sm opacity-80">
                                    We provide quality products and excellent customer service.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Quick Links</h4>
                                <ul className="text-sm space-y-2 opacity-80">
                                    <li><a href="#" className="hover:text-primary">Home</a></li>
                                    <li><a href="#" className="hover:text-primary">Products</a></li>
                                    <li><a href="#" className="hover:text-primary">About</a></li>
                                    <li><a href="#" className="hover:text-primary">Contact</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Contact</h4>
                                <ul className="text-sm space-y-2 opacity-80">
                                    <li>Email: info@store.com</li>
                                    <li>Phone: +1 234 567 890</li>
                                    <li>Address: 123 Store St</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Follow Us</h4>
                                <div className="flex space-x-4">
                                    <a href="#" className="hover:text-primary">Facebook</a>
                                    <a href="#" className="hover:text-primary">Twitter</a>
                                    <a href="#" className="hover:text-primary">Instagram</a>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm opacity-60">
                            © 2024 Store Name. All rights reserved.
                        </div>
                    </footer>
                );

            default:
                return (
                    <section
                        key={section.id}
                        className="p-6 border border-dashed border-gray-300"
                        style={{ color: layout.colors.text_secondary }}
                    >
                        <p className="text-center">Unknown section type: {section.type}</p>
                    </section>
                );
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Device Frame */}
            <div
                className="mx-auto border border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg"
                style={getDeviceStyles()}
            >
                {/* Preview Content */}
                <div
                    className="w-full h-full overflow-y-auto"
                    style={{
                        backgroundColor: layout.colors.background,
                        color: layout.colors.text_primary,
                        fontFamily: layout.typography.font_family_primary,
                        fontSize: layout.typography.font_size_base,
                        lineHeight: layout.typography.line_height_base,
                    }}
                >
                    <style>{generateCSSVariables()}</style>

                    {/* Render all sections */}
                    {layout.sections
                        .sort((a, b) => a.order - b.order)
                        .map(renderSection)}
                </div>
            </div>

            {/* Device Label */}
            <div className="text-center mt-2 text-sm text-gray-500">
                {device.charAt(0).toUpperCase() + device.slice(1)} Preview
            </div>
        </div>
    );
};