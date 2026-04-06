import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import { AppProviders } from "@/providers/app-providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "StarAcc",
    template: "%s | StarAcc",
  },
  description: "StarAcc is an accounting platform for serious operational finance teams.",
  metadataBase: new URL("https://staracc.example"),
  openGraph: {
    title: "StarAcc",
    description: "Multi-entity accounting with reconciliation, reporting, controls, and auditability.",
    type: "website",
    url: "https://staracc.example",
  },
  twitter: {
    card: "summary_large_image",
    title: "StarAcc",
    description: "Accounting platform for serious operators.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
