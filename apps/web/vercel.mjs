export function normalizeRailwayApiOrigin(rawOrigin = process.env.RAILWAY_API_ORIGIN) {
  if (!rawOrigin?.trim()) {
    throw new Error('RAILWAY_API_ORIGIN es obligatoria para desplegar el frontend en Vercel.');
  }

  let url;
  try {
    url = new URL(rawOrigin);
  } catch {
    throw new Error('RAILWAY_API_ORIGIN debe ser una URL HTTPS valida.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('RAILWAY_API_ORIGIN debe usar HTTPS.');
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('RAILWAY_API_ORIGIN no debe incluir ruta, query ni fragmento.');
  }

  return url.origin;
}

const railwayApiOrigin = normalizeRailwayApiOrigin();

export default {
  rewrites: [
    {
      source: '/api/:path*',
      destination: `${railwayApiOrigin}/api/:path*`,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};
