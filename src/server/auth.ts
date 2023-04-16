import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
  type Account as NextAuthAccount,
  type Session,
  type TokenSet,
} from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import axios from "axios";
import { type JWT as NextAuthJWT } from "next-auth/jwt";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth/core/types" {
  interface Session {
    error?: "RefreshAccessTokenError";
    accessToken?: string;
    providerId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string;
    expires_at: number;
    refresh_token: string;
    error?: "RefreshAccessTokenError";
  }
}

const SPOTIFY_REFRESH_TOKEN_URL = "https://accounts.spotify.com/api/token";
const spotifyScopes = `user-read-email playlist-modify-public playlist-modify-private`;

async function refreshAccessToken(refreshToken: string) {
  console.log("Input data is", refreshToken);
  try {
    const basicAuth = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    const { data } = await axios.post<{
      access_token: string;
      expires_in: number;
    }>(
      SPOTIFY_REFRESH_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("FINAL DATA", data);

    return {
      refreshToken,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    console.log("Error is", error);
    return {
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    session: async ({ session, user, token }) => {
      const [spotify] = await prisma.account.findMany({
        where: { userId: user.id, provider: "spotify" },
      });

      if (!spotify) {
        console.log("SPOTIFY NOT FOUND");
        return session;
      }

      if (!spotify?.expires_at || spotify.expires_at * 1000 < Date.now()) {
        // If the access token has expired, try to refresh it
        try {
          const tokens = await refreshAccessToken(
            (token?.refreshToken as string) ??
              (spotify?.refresh_token as string)
          );

          console.log("GIVING TOKENS", tokens);

          await prisma.account.update({
            data: {
              access_token: tokens.accessToken as string,
              expires_at: (tokens.accessTokenExpires as number) * 1000,
              refresh_token:
                (tokens.refreshToken as string) ?? spotify?.refresh_token,
            },
            where: {
              provider_providerAccountId: {
                provider: "spotify",
                providerAccountId: spotify.providerAccountId,
              },
            },
          });
        } catch (error) {
          console.error("Error refreshing access token", error);
          // The error property will be used client-side to handle the refresh token error
          session.error = "RefreshAccessTokenError";
        }
      }

      const accountDetails = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "spotify",
            providerAccountId: spotify?.providerAccountId,
          },
        },
      });

      return {
        ...session,
        accessToken: accountDetails?.access_token,
        providerId: accountDetails?.providerAccountId,
      };
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      authorization: `https://accounts.spotify.com/authorize?scope=${spotifyScopes}`,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
