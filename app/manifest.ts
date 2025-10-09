import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WatchLock',
    short_name: 'WatchLock',
    description:
      'Spoiler-safe messaging that locks every game-day reaction to the moment it happened.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
}
