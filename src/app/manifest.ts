import type { MetadataRoute } from 'next';

// Makes liferpg installable from the browser ("Install app" / "Add to Home screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'liferpg · การผจญภัยของคุณ',
    short_name: 'liferpg',
    description: 'เปลี่ยนการพัฒนาตัวเองสายเทค ทั้ง AI, Dev และเกม ให้เป็นการผจญภัย ทีละก้าวในจังหวะของคุณ',
    lang: 'th',
    start_url: '/today',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#173e32',
    theme_color: '#173e32',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
