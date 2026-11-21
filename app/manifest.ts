import type { MetadataRoute } from 'next'
import { siteDescription, siteName, siteTitle } from '@/lib/site'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteTitle,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    display: 'browser',
    background_color: '#1b1c20',
    theme_color: '#1b1c20',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  }
}
