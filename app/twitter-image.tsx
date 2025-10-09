import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(120deg, #0f172a 0%, #1d4ed8 45%, #38bdf8 100%)',
          color: '#f8fafc',
          padding: '72px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ opacity: 0.7, fontSize: 24, letterSpacing: 2, textTransform: 'uppercase' }}>
          Spoiler Safe
        </span>
        <div style={{ fontSize: 60, fontWeight: 800, margin: '16px 0' }}>WatchLock</div>
        <div style={{ fontSize: 28, maxWidth: 760, lineHeight: 1.35 }}>
          Lock every message to your game progress and celebrate together across every screen.
        </div>
      </div>
    ),
    size
  );
}
