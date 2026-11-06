import type { IncomingMessage, ServerResponse } from 'node:http';
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('{"error":"Method not allowed"}');
    return;
  }
  const secret = process.env.CRON_SECRET,
    url = process.env.VITE_SUPABASE_URL;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    res.end('{"error":"Unauthorized"}');
    return;
  }
  if (!url) {
    res.statusCode = 503;
    res.end('{"error":"Supabase is not configured"}');
    return;
  }
  try {
    const result = await fetch(
      `${url}/functions/v1/store?action=notifications`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    res.statusCode = result.status;
    res.end(await result.text());
  } catch {
    res.statusCode = 502;
    res.end('{"error":"Notification service unavailable"}');
  }
}
