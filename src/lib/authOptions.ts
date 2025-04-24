import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = Number(user.id);
      return token;
    },
    async session({ session, token, user }) {
      if (token?.id) {
        session.user.id = token.id as number;
      } else if (user?.id) {
        session.user.id =
          typeof user.id === "string" ? parseInt(user.id) : user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
};
