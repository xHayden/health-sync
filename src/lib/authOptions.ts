import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId:  process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
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
};
