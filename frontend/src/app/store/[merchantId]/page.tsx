/**
 * Store Dynamic Route Page
 *
 * IMPORTANT: This file uses .js extension instead of .tsx to avoid Next.js 15 type issues with dynamic routes.
 * In Next.js 15, there's a type conflict with the PageProps interface when using TypeScript with dynamic routes.
 *
 * The JavaScript approach bypasses these TypeScript issues while maintaining full functionality.
 *
 * Key Points:
 * - This is a Server Component in the Next.js App Router architecture
 * - It receives the dynamic route parameter (merchantId) via props.params
 * - It renders a simple UI with a link to the full store view
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the client component to enable client-side interactivity
// This pattern separates server/client code following Next.js best practices
const StoreContent = dynamic(() => import('@/components/store/StoreContent'), {
  ssr: true,
  loading: () => <div className="p-4 text-center">Loading store content...</div>,
});

export default function StorePage(props: any) {
  // Extract merchantId from the dynamic route parameters
  const { merchantId } = props.params;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Store Page</h1>
      <p className="mb-4">Merchant ID: {merchantId}</p>

      {/* Wrap client component in Suspense for better loading experience */}
      <Suspense fallback={<div className="p-4">Loading products...</div>}>
        <StoreContent merchantId={merchantId} />
      </Suspense>
    </div>
  );
}
