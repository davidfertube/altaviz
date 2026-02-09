import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Altaviz - Predictive Maintenance Platform',
    template: '%s | Altaviz',
  },
  description: 'AI-powered predictive maintenance for natural gas compression equipment. Monitor, predict, and prevent failures before they happen.',
  keywords: ['predictive maintenance', 'compressor monitoring', 'natural gas', 'IoT', 'MLOps', 'industrial analytics'],
  authors: [{ name: 'Altaviz' }],
  openGraph: {
    title: 'Altaviz - Predictive Maintenance Platform',
    description: 'AI-powered predictive maintenance for natural gas compression equipment. Monitor, predict, and prevent compressor failures.',
    type: 'website',
    siteName: 'Altaviz',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altaviz - Predictive Maintenance Platform',
    description: 'AI-powered predictive maintenance for natural gas compression equipment.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
