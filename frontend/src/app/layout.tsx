import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
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
    default: 'Altaviz - Predictive Maintenance for Natural Gas Compressors',
    template: '%s | Altaviz',
  },
  description: 'Compressor monitoring software for midstream oil and gas operators. Predict bearing failures, thermal events, and degradation 48 hours early. Reduce unplanned shutdowns by 73%. Monitor vibration, temperature, and pressure across your fleet.',
  keywords: [
    'compressor monitoring software',
    'predictive maintenance oil and gas',
    'natural gas compressor monitoring',
    'compressor health monitoring',
    'vibration monitoring compressor',
    'midstream predictive maintenance',
    'compressor failure prediction',
    'gas compression equipment monitoring',
    'SCADA compressor analytics',
    'remaining useful life compressor',
    'EPA Subpart W emissions tracking',
    'unplanned downtime reduction',
  ],
  authors: [{ name: 'Altaviz' }],
  openGraph: {
    title: 'Altaviz - Predictive Maintenance for Natural Gas Compressors',
    description: 'Stop emergency shutdowns before they start. Monitor vibration, temperature, and pressure across your compressor fleet. Get 48-hour advance warning of failures.',
    type: 'website',
    siteName: 'Altaviz',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altaviz - Predictive Maintenance for Natural Gas Compressors',
    description: 'Stop emergency shutdowns before they start. Compressor monitoring software for midstream operators.',
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
        </ThemeProvider>
      </body>
    </html>
  );
}
