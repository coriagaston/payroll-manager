import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const passwordOk = await bcrypt.compare(credentials.password, user.password);
        if (!passwordOk) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

/**
 * Verifica que el usuario autenticado tenga acceso al negocio indicado.
 * Lanza un error si no pertenece o no tiene el rol mínimo requerido.
 */
export async function requireBusinessAccess(
  businessId: string,
  userId: string,
  minRole: "VIEWER" | "ADMIN" | "OWNER" = "VIEWER"
) {
  const roleHierarchy = { VIEWER: 0, ADMIN: 1, OWNER: 2 };

  const membership = await prisma.businessMember.findUnique({
    where: { userId_businessId: { userId, businessId } },
  });

  if (!membership) throw new Error("FORBIDDEN");

  const userLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy];
  const requiredLevel = roleHierarchy[minRole];

  if (userLevel < requiredLevel) throw new Error("FORBIDDEN");

  return membership;
}
