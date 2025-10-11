import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #1e293b 100%)',
          color: '#f8fafc',
          padding: '96px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 16 }}>WatchLock</div>
        <div style={{ fontSize: 32, fontWeight: 600, maxWidth: 720, lineHeight: 1.3 }}>
          Share the highs without the spoilers. Every cheer unlocked right on cue.
        </div>
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'rgba(148, 163, 184, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            WL
          </div>
          <span>Spoiler-safe watch parties for every crew</span>
        </div>
      </div>
    ),
    size
  );
}
