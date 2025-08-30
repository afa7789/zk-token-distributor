import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply middleware to API routes that need authentication
  if (request.nextUrl.pathname.startsWith('/api/inputs')) {
    const sessionToken = request.cookies.get('session-token');
    const sessionAddress = request.cookies.get('session-address');
    
    if (!sessionToken || !sessionAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/inputs/:path*']
}
