import { NextRequest, NextResponse } from 'next/server';

type Theme = {
    id: string;
    name: string;
    description: string;
    created_at: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        error: string;
        success: string;
        warning: string;
    };
    typography: {
        fontFamily: {
            heading: string;
            body: string;
        };
        fontSize: Record<string, string>;
        fontWeight: Record<string, number>;
        lineHeight: Record<string, string>;
    };
    layout: {
        spacing: Record<string, string>;
        borderRadius: Record<string, string>;
        breakpoints: Record<string, string>;
        maxWidth: Record<string, string>;
    };
    componentStyles: {
        button: {
            primary: Record<string, string>;
            secondary: Record<string, string>;
        };
        card: Record<string, string>;
        form: {
            input: Record<string, string>;
            label: Record<string, string>;
        };
        navigation: Record<string, string>;
    };
};

type ErrorResponse = {
    error: string;
    message: string;
};

/**
 * API endpoint to get a tenant's theme by tenant ID
 *
 * This endpoint fetches theme data from the backend based on the tenant ID
 * It's used by the ThemeContext to load the appropriate theme
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'tenant ID parameter is required' },
                { status: 400 }
            );
        }

        // Make request to backend API
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/tenants/${id}/theme`, {
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

        const theme = await response.json();
        return NextResponse.json(theme);

    } catch (error) {
        console.error('Error fetching theme:', error);
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
 * API endpoint to update a tenant's theme
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'tenant ID parameter is required' },
                { status: 400 }
            );
        }

        // Make request to backend API
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/tenants/${id}/theme`, {
            method: 'PUT',
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

        const theme = await response.json();
        return NextResponse.json(theme);

    } catch (error) {
        console.error('Error updating theme:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}