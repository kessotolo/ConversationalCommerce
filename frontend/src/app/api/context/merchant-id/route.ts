import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to expose the merchant ID from the x-merchant-id header
 * This is needed because client components can't access headers directly
 * 
 * @returns JSON response with merchantId
 */
export async function GET(request: NextRequest) {
  const merchantId = request.headers.get('x-merchant-id');
  
  return NextResponse.json({ 
    merchantId: merchantId || null 
  });
}
