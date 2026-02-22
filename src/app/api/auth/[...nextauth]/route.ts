
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import type { AuthOptions } from "next-auth";

const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    }),
    // Email/Password
    CredentialsProvider({
      name: "Email și parolă",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Parolă", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Caută userul în baza de date Prisma
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password || user.blocked) return null;
        
        // Compară parola cu hash-ul din baza de date
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (isValid) {
          return { id: user.id.toString(), name: user.name, email: user.email, isAdmin: user.isAdmin };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Pentru OAuth (Google/Facebook), creează sau actualizează userul
      if (account?.provider === "google" || account?.provider === "facebook") {
        const email = user.email;
        if (!email) return false;
        
        // Verifică dacă userul există deja
        let dbUser = await prisma.user.findUnique({ where: { email } });
        
        if (!dbUser) {
          // Creează user nou pentru OAuth
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              password: "", // OAuth users nu au parolă
              blocked: false,
              isAdmin: false
            }
          });
        }
        
        return !dbUser.blocked;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as any).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    }
  },
  session: { 
    strategy: "jwt" as const,
    maxAge: 365 * 24 * 60 * 60, // 1 an - sesiunea nu expiră automat
  },
  jwt: {
    maxAge: 365 * 24 * 60 * 60, // 1 an
  },
  pages: {
    signIn: "/login"
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
