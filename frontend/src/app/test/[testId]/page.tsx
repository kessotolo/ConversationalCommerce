import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Test Dynamic Route',
    description: 'A test page to isolate dynamic route type issues',
}

export default function TestPage({ params }: { params: any }) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Test Dynamic Route</h1>
                <p className="text-gray-600">Test ID: {params.testId}</p>
            </div>
        </div>
    )
}