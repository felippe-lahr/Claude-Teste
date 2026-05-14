import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/((?!$|login|api/auth|api/health|api/admin/sync-cotacoes|_next/static|_next/image|favicon.ico).*)',
  ],
};
