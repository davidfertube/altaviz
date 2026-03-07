import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import CookieConsent from '@/components/ui/CookieConsent';
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
  metadataBase: new URL('https://www.altaviz.app'),
  title: {
    default: 'Altaviz - Predictive Compressor Fleet Monitoring for Midstream Operators',
    template: '%s | Altaviz',
  },
  description: 'Monitor vibration, temperature, and pressure across your compressor fleet. Get 48-hour advance warning of failures. Reduce emergency shutdowns by 40%. Automated EPA emissions and compliance reporting.',
  keywords: [
    'compressor fleet management',
    'predictive maintenance oil and gas',
    'compressor monitoring software',
    'compressor health monitoring',
    'EPA compliance software',
    'midstream predictive maintenance',
    'compressor failure prediction',
    'compressor predictive maintenance',
    'SCADA compressor analytics',
    'remaining useful life compressor',
    'EPA Subpart W emissions tracking',
    'unplanned downtime reduction',
  ],
  authors: [{ name: 'Altaviz' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Altaviz - Predictive Compressor Fleet Monitoring for Midstream Operators',
    description: 'Get 48-hour advance warning of compressor failures. Monitor vibration, temperature, and pressure across your fleet. Reduce emergency shutdowns by 40%.',
    type: 'website',
    siteName: 'Altaviz',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altaviz - Predictive Compressor Fleet Monitoring for Midstream Operators',
    description: 'Get 48-hour advance warning of compressor failures. Predictive monitoring for midstream operators.',
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
          <Toaster />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
