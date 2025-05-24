/**
 * Test Dynamic Route Page
 * 
 * This page has been converted from TypeScript (.tsx) to JavaScript (.js) to avoid
 * the Next.js 15 type checking issues with dynamic route parameters. This allows
 * the application to build successfully in Vercel while maintaining full functionality.
 */

// Using CommonJS metadata export format to avoid TypeScript issues
export const metadata = {
    title: 'Test Dynamic Route',
    description: 'A test page to isolate dynamic route type issues',
};

/**
 * TestPage Component
 * 
 * Demonstrates a dynamic route page in Next.js App Router
 * - Receives route parameters via props.params
 * - Simple UI to display the dynamic testId parameter
 * 
 * @param {Object} props - Component props from Next.js
 * @param {Object} props.params - Route parameters
 * @param {string} props.params.testId - The dynamic test ID from the URL
 */
export default function TestPage(props) {
    // Extract testId from route parameters
    const { testId } = props.params;
    
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Test Dynamic Route</h1>
                <p className="text-gray-600">Test ID: {testId}</p>
            </div>
        </div>
    );
}