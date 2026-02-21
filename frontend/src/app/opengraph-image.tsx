import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Altaviz - Predictive Pipeline Monitoring for Midstream Operators';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0C1018',
          padding: '60px',
        }}
      >
        {/* Logo + Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#C4A77D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 32 32" width="36" height="36" fill="none">
              <path
                d="M16 2C12.5 8.5 7 14 7 20C7 25.5 11 30 16 30C21 30 25 25.5 25 20C25 14 19.5 8.5 16 2Z"
                fill="white"
              />
              <path
                d="M6 20L11 20L13.5 16L16 24L18.5 16L21 20L26 20"
                stroke="#C4A77D"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: '40px',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            Altaviz
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            Know Your Pipeline Is Safe.
          </span>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#C4A77D',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            Before the Alarm Goes Off.
          </span>
        </div>

        {/* Subtitle */}
        <span
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            maxWidth: '700px',
          }}
        >
          Predictive pipeline monitoring for midstream operators
        </span>

        {/* Bottom metrics bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
            marginTop: '48px',
            padding: '16px 32px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            { value: '48hr', label: 'Early Warning' },
            { value: '40%', label: 'Fewer Shutdowns' },
            { value: '99.7%', label: 'Uptime' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#C4A77D',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
