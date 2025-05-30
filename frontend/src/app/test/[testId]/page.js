/**
 * Test Dynamic Route Page
 * 
 * Optimized for mobile-first African markets with attention to:
 * - Lightweight component design for faster loading on low-bandwidth connections
 * - Simple UI elements that work well across different mobile devices
 * - Reduced JavaScript execution for better performance on low-end devices
 */

// Generate metadata for the page
export function generateMetadata({ params }) {
    return {
        title: 'Test Dynamic Route',
        description: 'A test page optimized for mobile users in African markets',
    };
}

/**
 * TestPage Component
 * 
 * Demonstrates a dynamic route page in Next.js App Router
 * - Uses server component pattern for better performance in low-bandwidth environments
 * - Minimal client-side JavaScript for faster loading
 * - Progressive enhancement for users with connectivity issues
 * 
 * @param {Object} props - Component props from Next.js
 * @param {Object} props.params - Route parameters
 * @param {string} props.params.testId - The dynamic test ID from the URL
 */
export default function TestPage({ params }) {
    // Extract testId from route parameters
    const { testId } = params;
    
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Test Dynamic Route</h1>
                <p className="text-gray-600">Test ID: {testId}</p>
            </div>
        </div>
    );
}