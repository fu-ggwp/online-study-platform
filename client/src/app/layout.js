import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/layout/auth-provider";
import {
  ACCESS_TOKEN_COOKIE,
  ACTIVE_ROLE_COOKIE,
  VALID_ROLES,
} from "@/lib/auth-constants";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CardIO",
  description:
    "Create, share, discover, and practice public study sets with CardIO.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialIsAuthenticated = Boolean(
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  );
  const roleCookie = cookieStore.get(ACTIVE_ROLE_COOKIE)?.value;
  const initialRole = VALID_ROLES.has(roleCookie) ? roleCookie : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider
          initialIsAuthenticated={initialIsAuthenticated}
          initialRole={initialRole}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
