// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
  // Use Prisma adapter if you’re persisting users in a database
  adapter: PrismaAdapter(prisma),

  callbacks: {
    // The JWT callback is called whenever a JSON Web Token is created or updated.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // The session callback is called whenever a session is checked.
    async session({ session, token, user }) {
      if (token && token.id) {
        session.user.id = token.id as number;
      }
      else if (user && user.id) {
        if (typeof user.id === "string") {
          session.user.id = parseInt(user.id);
        }
        else {
          session.user.id = user.id;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
