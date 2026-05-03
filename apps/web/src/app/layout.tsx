import type { Metadata } from 'next';
import { DM_Sans, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'StudyFlow',
    template: '%s | StudyFlow',
  },
  description:
    'The first app that connects your study sessions with your daily wellbeing habits. Study smarter, live better.',
  keywords: ['study', 'productivity', 'wellbeing', 'student', 'habits', 'focus', 'timer'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
