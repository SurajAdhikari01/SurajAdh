import { ImageResponse } from 'next/og'
import { siteName } from '@/lib/site'

export const dynamic = 'force-static'
export const alt = 'Suraj Adhikari: C++, systems and compiler engineer in Nepal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The share card echoes the hero: the same headline, the same quiet palette.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(180deg, #16171c 0%, #1d1c26 100%)',
          color: '#f4f2ee',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#a7a6b0' }}>
          <span style={{ color: '#f4f2ee' }}>{siteName}</span>
          <span>Kathmandu, Nepal</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 76, letterSpacing: -2, lineHeight: 1, whiteSpace: 'nowrap', gap: 20 }}>
            <span>Engineering</span>
            <span style={{ color: '#8a8994' }}>from</span>
            <span style={{ color: '#8a8994' }}>the</span>
            <span style={{ color: '#a49cff' }}>token</span>
            <span style={{ display: 'flex', color: '#8a8994' }}>
              up<span style={{ color: '#f2917c' }}>.</span>
            </span>
          </div>
          <div style={{ fontSize: 30, color: '#a7a6b0' }}>
            C++ and systems engineer. Building Sajilo, a language and compiler.
          </div>
        </div>
      </div>
    ),
    size,
  )
}
