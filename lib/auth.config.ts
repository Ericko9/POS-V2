import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig
