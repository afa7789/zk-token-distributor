import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientProviders from '@/components/ClientProviders';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZK Token Distributor",
  description: "A zero-knowledge privacy-preserving token distribution system using ZK-SNARKs for anonymous airdrops and secure token claims.",
  keywords: "zero-knowledge, zk-snarks, token distribution, airdrop, privacy, blockchain, ethereum, circom",
  authors: [{ name: "ZK Token Distributor Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ZK Token Distributor",
    description: "Privacy-preserving token distribution using zero-knowledge proofs",
    type: "website",
    siteName: "ZK Token Distributor",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZK Token Distributor",
    description: "Privacy-preserving token distribution using zero-knowledge proofs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
