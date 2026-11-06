import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import handler from '../api/seo.ts';
const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split('=')),
);
Object.assign(process.env, env, { SITE_URL: 'https://scentsation.example' });
const server = createServer((req, res) => {
  void handler(req, res).catch(() => {
    res.statusCode = 500;
    res.end('error');
  });
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No test server.');
const base = `http://127.0.0.1:${address.port}`;
try {
  const sitemap = await fetch(`${base}/?mode=sitemap`);
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /<urlset/);
  assert.match(xml, /https:\/\/scentsation.example\/shop/);
  assert.ok(!xml.includes('/admin'));
  console.log('PASS dynamic sitemap reads published catalogue');
  const robots = await fetch(`${base}/?mode=robots`);
  assert.equal(robots.status, 200);
  assert.match(
    await robots.text(),
    /Sitemap: https:\/\/scentsation.example\/sitemap.xml/,
  );
  console.log('PASS robots includes canonical sitemap');
  const missing = await fetch(`${base}/?slug=this-product-does-not-exist`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /<div id="root"><\/div>/);
  console.log('PASS unavailable product serves application with HTTP 404');
  const malformed = await fetch(
    `${base}/?slug=${encodeURIComponent('<script>')}`,
  );
  assert.equal(malformed.status, 404);
  console.log('PASS invalid product path rejected');
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
