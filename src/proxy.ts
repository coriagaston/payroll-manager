import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;

    // Login siempre debe poder renderizar, incluso si quedo una cookie vieja.
    if (pathname.startsWith("/login")) {
      return NextResponse.next();
    }

    // Registro deshabilitado: redirigir al login
    if (pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
      error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Permitir rutas de auth y API de auth sin token
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
