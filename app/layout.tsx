import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { siteDescription, siteName, siteTitle, siteUrl } from '@/lib/site'
import './globals.css'
import { MotionPreferences } from '@/components/motion-preferences'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: 'technology',
  keywords: [
    'software engineer Nepal',
    'compiler engineer',
    'Sajilo programming language',
    'C++ compiler',
    'C++ developer Nepal',
    'C++ systems engineer',
    'systems programming',
    'network software engineer',
    'remote software engineer',
    'remote developer Nepal',
    'performance engineering',
    'Suraj Adhikari',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    url: '/',
    title: siteTitle,
    description: siteDescription,
    siteName,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1c20' },
  ],
  colorScheme: 'dark light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <MotionPreferences>{children}</MotionPreferences>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
