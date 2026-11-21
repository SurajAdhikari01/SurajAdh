import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-static'

// Search engines and AI answer engines alike are welcome: being cited by an
// assistant is how a lot of people find a portfolio now.
const answerEngines = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: answerEngines, allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
