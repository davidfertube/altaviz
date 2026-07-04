import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://altaviz.vercel.app"),
  title: "Altaviz — AI Media Buying Copilot",
  description:
    "Anomaly detection, a Claude-powered copilot, and an MCP server for cross-platform media buying teams.",
  openGraph: {
    title: "Altaviz — AI Media Buying Copilot",
    description:
      "Catch the anomaly before it eats your margin. Statistical detection, a Claude copilot, and an MCP server for media buying teams.",
    url: "/",
    siteName: "Altaviz",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Altaviz — AI Media Buying Copilot",
    description: "Catch the anomaly before it eats your margin.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
