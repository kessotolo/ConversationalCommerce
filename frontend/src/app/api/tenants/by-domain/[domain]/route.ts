import { NextRequest, NextResponse } from 'next/server';

type Tenant = {
    id: string; // UUID format from backend
    name: string;
    subdomain: string;
    customDomain?: string;
};

type ErrorResponse = {
    error: string;
    message: string;
};

/**
 * API endpoint to get tenant by custom domain
 *
 * This endpoint fetches tenant data from the backend based on a custom domain
 * It's used by the TenantContext when a user accesses the site via a custom domain
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { domain: string } }
) {
    try {
        const { domain } = params;

        if (!domain) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'domain parameter is required' },
                { status: 400 }
            );
        }

        // Make request to backend API
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/tenants/by-domain/${encodeURIComponent(domain)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(error, { status: response.status });
        }

        const tenant = await response.json();
        return NextResponse.json(tenant);

    } catch (error) {
        console.error('Error fetching tenant by domain:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}