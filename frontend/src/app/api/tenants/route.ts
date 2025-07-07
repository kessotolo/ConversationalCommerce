import { NextRequest, NextResponse } from 'next/server';

type TenantRequest = {
    storeName: string;
    businessName: string;
    phoneNumber: string;
    storeEmail: string;
    category: string;
    subdomain: string;
    userId: string;
};

type TenantResponse = {
    id: string;
    subdomain: string;
    customDomain?: string;
    name: string;
    createdAt: string;
};

type ErrorResponse = {
    error: string;
    message: string;
};

/**
 * API endpoint to create a new tenant (store) for a user
 *
 * This creates the tenant record, initializes with default theme,
 * and associates it with the authenticated user
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const requiredFields = ['storeName', 'businessName', 'phoneNumber', 'storeEmail', 'category', 'subdomain', 'userId'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: 'Bad Request', message: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        // Make request to backend API
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/tenants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward authorization header if present
                ...(request.headers.get('authorization') && {
                    'Authorization': request.headers.get('authorization')!,
                }),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(error, { status: response.status });
        }

        const tenant = await response.json();
        return NextResponse.json(tenant, { status: 201 });

    } catch (error) {
        console.error('Error creating tenant:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}

/**
 * API endpoint to get tenants for a user
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'userId parameter is required' },
                { status: 400 }
            );
        }

        // Make request to backend API
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/tenants?userId=${userId}`, {
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

        const tenants = await response.json();
        return NextResponse.json(tenants);

    } catch (error) {
        console.error('Error fetching tenants:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}