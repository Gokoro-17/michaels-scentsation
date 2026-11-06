import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }
  const site =
    process.env.SITE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : '');
  const dbUrl = process.env.VITE_SUPABASE_URL,
    key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!site || !dbUrl || !key) {
    res.statusCode = 503;
    res.end('Website origin or database is not configured.');
    return;
  }
  const url = new URL(req.url || '/', site),
    mode = url.searchParams.get('mode');
  if (mode === 'robots') {
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /track\nSitemap: ${site}/sitemap.xml\n`,
    );
    return;
  }
  const db = createClient(dbUrl, key, { auth: { persistSession: false } });
  if (mode === 'sitemap') {
    const { data, error } = await db
      .from('products')
      .select('slug')
      .eq('published', true);
    if (error) {
      res.statusCode = 503;
      res.end('Catalogue temporarily unavailable.');
      return;
    }
    const paths = [
      '',
      '/shop',
      '/about',
      '/contact',
      '/delivery',
      ...(data || []).map((p) => `/product/${p.slug}`),
    ];
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(site + path)}</loc></url>`).join('')}</urlset>`,
    );
    return;
  }
  const slug = url.searchParams.get('slug');
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    res.statusCode = 404;
    res.end('Fragrance not found.');
    return;
  }
  const { data: p, error } = await db
    .from('products')
    .select(
      'name,slug,description,image_url,price,discount_price,stock,available',
    )
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) {
    res.statusCode = 503;
    res.end('Catalogue temporarily unavailable.');
    return;
  }
  const html = await readFile(
    new URL('../dist/index.html', import.meta.url),
    'utf8',
  );
  if (!p) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  const title = `${p.name} | Michael’s Scentsation`,
    description = p.description.slice(0, 160),
    canonical = `${site}/product/${slug}`;
  const structured = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.image_url,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: p.discount_price ?? p.price,
      availability:
        p.available && p.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonical,
    },
  }).replace(/</g, '\\u003c');
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(
      /<meta[^>]+(?:name="description"|property="og:[^"]+")[^>]*>/gi,
      '',
    );
  const tags = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"/><link rel="canonical" href="${escape(canonical)}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:type" content="product"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:image" content="${escape(p.image_url)}"/><script type="application/ld+json">${structured}</script>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60');
  res.end(cleaned.replace('</head>', tags + '</head>'));
}
