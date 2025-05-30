import React from 'react';
import { ThemeProvider } from '../../../src/components/ThemeProvider';
import StorefrontLinks from '../../../src/components/dashboard/StorefrontLinks';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Eye, BarChart3, ShoppingBag, TrendingUp } from 'lucide-react';

// Layout component to use theme context
function StorefrontPageContent() {
  const { theme, isLoading } = useTheme();

  if (isLoading) {
    return <div className="p-6">Loading theme information...</div>;
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourplatform.com';
  const storeUrl = `https://${theme.subdomain || 'default'}.${baseDomain}`;

  return (
    <div className="min-h-screen bg-[#fdfcf7] pb-10">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-10 bg-gradient-to-r from-[#e8f6f1] to-[#fdfcf7] rounded-b-3xl shadow-sm mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Your Storefront</h1>
          <p className="text-lg text-gray-600 mb-4">Manage your online presence, preview your theme, and track your store's performance.</p>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2 bg-[#6C9A8B] text-white rounded-full font-semibold shadow hover:bg-[#4e6e5e] transition-all"
        >
          <Eye size={20} /> View Storefront
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 px-4">
        {/* Sidebar Navigation */}
        <aside className="md:col-span-1 sticky top-24 self-start">
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-2">
            <StorefrontLinks />
          </div>
        </aside>
        {/* Main Content */}
        <main className="md:col-span-4 flex flex-col gap-8">
          {/* Theme Preview */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#e6f0eb] flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Current Theme: {theme.name}</h2>
              <p className="text-sm text-gray-500 mb-4">Preview how your storefront looks to customers.</p>
              <div className="border rounded-2xl p-6 bg-[#f8faf8] flex flex-col gap-4 max-w-md mx-auto shadow-inner">
                <div className="h-12 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: theme.colors.primary, color: 'white', fontFamily: theme.typography.fontFamily.heading, fontWeight: theme.typography.fontWeight.bold }}>
                  Storefront Header
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <button style={{ backgroundColor: theme.colors.primary, color: theme.componentStyles.button.primary.text, border: theme.componentStyles.button.primary.border, borderRadius: theme.componentStyles.button.primary.borderRadius, padding: theme.componentStyles.button.primary.padding }}>Primary</button>
                  <button style={{ backgroundColor: theme.componentStyles.button.secondary.background, color: theme.componentStyles.button.secondary.text, border: theme.componentStyles.button.secondary.border, borderRadius: theme.componentStyles.button.secondary.borderRadius, padding: theme.componentStyles.button.secondary.padding }}>Secondary</button>
                </div>
                <div style={{ backgroundColor: theme.componentStyles.card.background, color: theme.componentStyles.card.text, border: theme.componentStyles.card.border, borderRadius: theme.componentStyles.card.borderRadius, boxShadow: theme.componentStyles.card.shadow, padding: theme.componentStyles.card.padding }}>
                  <h3 style={{ fontFamily: theme.typography.fontFamily.heading, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, marginBottom: '0.5rem' }}>Sample Card</h3>
                  <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.secondary }}>This is how your product cards will appear on your storefront.</p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <a href="/dashboard/storefront/customize" className="px-4 py-2 bg-[#6C9A8B] text-white rounded-full font-semibold shadow hover:bg-[#4e6e5e] transition-all">Customize Storefront</a>
              </div>
            </div>
          </div>
          {/* Storefront Statistics */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#e6f0eb]">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Storefront Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center bg-[#e8f6f1] rounded-xl p-6 shadow-sm">
                <BarChart3 className="w-8 h-8 text-[#6C9A8B] mb-2" />
                <p className="text-sm text-gray-500">Visitors (Last 7 days)</p>
                <p className="text-2xl font-bold">243</p>
              </div>
              <div className="flex flex-col items-center bg-[#f5f9f7] rounded-xl p-6 shadow-sm">
                <TrendingUp className="w-8 h-8 text-[#6C9A8B] mb-2" />
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold">3.2%</p>
              </div>
              <div className="flex flex-col items-center bg-[#e8f6f1] rounded-xl p-6 shadow-sm">
                <ShoppingBag className="w-8 h-8 text-[#6C9A8B] mb-2" />
                <p className="text-sm text-gray-500">Products Viewed</p>
                <p className="text-2xl font-bold">867</p>
              </div>
            </div>
          </div>
          {/* Storefront SEO */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#e6f0eb]">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Storefront SEO</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter storefront title" defaultValue={`${theme.name} - Online Store`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg" rows={3} placeholder="Enter storefront description" defaultValue="Shop our latest products with secure checkout and fast delivery." />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Wrap page with ThemeProvider
export default function StorefrontPage() {
  return (
    <ThemeProvider>
      <StorefrontPageContent />
    </ThemeProvider>
  );
}
