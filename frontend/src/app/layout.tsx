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
  title: {
    default: 'Altaviz - Pipeline Integrity Management for Oil & Gas',
    template: '%s | Altaviz',
  },
  description: 'Pipeline integrity management software for midstream oil and gas operators. Predict wall thinning, corrosion, and degradation 48 hours early. Reduce unplanned shutdowns by 73%. PHMSA-compliant monitoring across your pipeline network.',
  keywords: [
    'pipeline integrity management',
    'predictive maintenance oil and gas',
    'pipeline monitoring software',
    'pipeline health monitoring',
    'PHMSA compliance software',
    'midstream predictive maintenance',
    'pipeline failure prediction',
    'pipeline corrosion monitoring',
    'SCADA pipeline analytics',
    'remaining useful life pipeline',
    'EPA Subpart W emissions tracking',
    'unplanned downtime reduction',
  ],
  authors: [{ name: 'Altaviz' }],
  openGraph: {
    title: 'Altaviz - Pipeline Integrity Management for Oil & Gas',
    description: 'Stop emergency shutdowns before they start. Monitor vibration, temperature, and pressure across your pipeline network. Get 48-hour advance warning of failures.',
    type: 'website',
    siteName: 'Altaviz',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altaviz - Pipeline Integrity Management for Oil & Gas',
    description: 'Stop emergency shutdowns before they start. Pipeline integrity management for midstream operators.',
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
