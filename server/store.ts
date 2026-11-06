import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  isReceipt,
  isUuid,
  normalizePhone,
  parseAccess,
  parseCheckout,
  validImageUrl,
} from './domain.ts';
type Env = Record<string, string | undefined>;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const orderFields =
  'id,reference,customer_name,email,phone,address,instructions,subtotal,delivery_fee,total,status,payment_status,stock_deducted,created_at,updated_at,order_items(*)';
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === '23505')
    throw new HttpError(
      409,
      'This entry already exists. A purchased fragrance can only be reviewed once.',
    );
  const safe = [
    'A fragrance is unavailable',
    'A fragrance or bundle component',
    'The store is not accepting',
    'Insufficient stock',
    'Only pending payments',
    'Only a pending payment',
    'This order cannot accept',
    'Invalid order status transition',
    'Paid or delivered orders',
    'Only a confirmed purchase',
    'Nested bundles',
    'Bundle components require',
  ];
  if (safe.some((s) => error.message.startsWith(s)))
    throw new HttpError(409, error.message);
  console.error('Database operation failed:', error.code || 'unknown');
  throw new HttpError(
    500,
    'We couldn’t complete this request. Please try again.',
  );
}
async function rate(
  db: SupabaseClient,
  key: string,
  limit: number,
  seconds: number,
) {
  const { data, error } = await db.rpc('consume_rate', {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  dbError(error);
  if (!data)
    throw new HttpError(429, 'Too many requests. Please try again later.');
}
async function authorizedOrder(db: SupabaseClient, v: Record<string, unknown>) {
  const access = parseAccess(v);
  const { data, error } = await db
    .from('orders')
    .select('id')
    .eq('reference', access.reference)
    .eq('access_hash', await hash(access.token))
    .maybeSingle();
  dbError(error);
  if (!data)
    throw new HttpError(
      404,
      'No order matches those details. Check your reference and private access code.',
    );
  return data.id as string;
}
async function getOrder(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from('orders')
    .select(orderFields)
    .eq('id', id)
    .single();
  dbError(error);
  return data;
}
function decodeFile(v: Record<string, unknown>, image = false) {
  if (
    typeof v.file !== 'string' ||
    v.file.length > 4194304 ||
    typeof v.type !== 'string'
  )
    throw new HttpError(400, 'Please choose a file up to 3 MB.');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(v.file), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, 'Invalid file.');
  }
  if (
    !bytes.length ||
    bytes.length > 3145728 ||
    !isReceipt(bytes, v.type) ||
    (image && v.type === 'application/pdf')
  )
    throw new HttpError(
      400,
      image
        ? 'Choose a valid JPG or PNG image up to 3 MB.'
        : 'Choose a valid JPG, PNG or PDF receipt up to 3 MB.',
    );
  return {
    bytes,
    type: v.type,
    ext:
      v.type === 'image/png' ? 'png' : v.type === 'image/jpeg' ? 'jpg' : 'pdf',
  };
}
async function dispatch(db: SupabaseClient, env: Env) {
  if (
    !env.RESEND_API_KEY ||
    !env.ADMIN_NOTIFICATION_EMAIL ||
    !env.NOTIFICATION_FROM
  )
    return { sent: 0, configured: false };
  const { data: events, error } = await db.rpc('claim_notifications');
  dbError(error);
  let sent = 0;
  for (const event of events || []) {
    try {
      const order = event.order_id ? await getOrder(db, event.order_id) : null;
      const link = env.SITE_URL
        ? `${env.SITE_URL.replace(/\/$/, '')}/admin`
        : '';
      const text = [
        `MICHAEL'S SCENTSATION — ${event.kind.replaceAll('_', ' ')}`,
        order
          ? `Order: ${order.reference}\nCustomer: ${order.customer_name}\nProducts: ${order.order_items.map((i: { name: string; quantity: number }) => `${i.name} × ${i.quantity}`).join(', ')}\nTotal: NGN ${order.total}`
          : JSON.stringify(event.payload),
        link
          ? `View order and private payment receipt after admin sign-in: ${link}`
          : 'Sign in to the admin dashboard to view the order and private receipt.',
      ].join('\n\n');
      const response = await fetch('https://api.resend.com/emails', {
        signal: AbortSignal.timeout(5000),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': event.id,
        },
        body: JSON.stringify({
          from: env.NOTIFICATION_FROM,
          to: [env.ADMIN_NOTIFICATION_EMAIL],
          subject: `Michael’s Scentsation · ${event.kind.replaceAll('_', ' ')}${order ? ` · ${order.reference}` : ''}`,
          text,
        }),
      });
      if (!response.ok)
        throw new Error(`Email provider returned ${response.status}`);
      const result = await db
        .from('notifications')
        .update({
          sent_at: new Date().toISOString(),
          last_error: null,
          locked_until: null,
        })
        .eq('id', event.id);
      dbError(result.error);
      sent++;
    } catch (e) {
      await db
        .from('notifications')
        .update({
          last_error: (e as Error).message.slice(0, 200),
          locked_until: null,
        })
        .eq('id', event.id);
    }
  }
  return { sent, configured: true };
}
export async function handleRequest(
  req: Request,
  env: Env,
  waitUntil?: (promise: Promise<unknown>) => void,
) {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: cors });
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
      throw new HttpError(503, 'The store is temporarily unavailable.');
    const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const notify = async () => {
      const work = dispatch(db, env).catch(() => {
        console.error('Notification dispatch failed; events remain queued.');
      });
      if (waitUntil) waitUntil(work);
      else await work;
    };
    const url = new URL(req.url),
      action = url.searchParams.get('action') || '';
    if (action === 'notifications' && req.method === 'GET') {
      if (
        !env.CRON_SECRET ||
        req.headers.get('Authorization') !== `Bearer ${env.CRON_SECRET}`
      )
        throw new HttpError(401, 'Unauthorized');
      return json(await dispatch(db, env));
    }
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const size = Number(req.headers.get('content-length') || 0);
    if (size > 4300000) throw new HttpError(413, 'The file is too large.');
    const raw = await req.text();
    if (raw.length > 4300000)
      throw new HttpError(413, 'The file is too large.');
    let v: Record<string, unknown>;
    try {
      v = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'Invalid request.');
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
      throw new HttpError(400, 'Invalid request.');
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    const ipHash = await hash(`${env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`);
    if (action === 'checkout') {
      await rate(db, `checkout:${ipHash}`, 10, 3600);
      let c;
      try {
        c = parseCheckout(v);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const { data, error } = await db.rpc('place_order', {
        p_customer: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          instructions: c.instructions,
        },
        p_items: c.items,
        p_hash: await hash(c.token),
      });
      dbError(error);
      const order = await getOrder(db, data);
      await notify();
      return json(order, 201);
    }
    if (action === 'track') {
      await rate(db, `track:${ipHash}`, 120, 3600);
      const id = await authorizedOrder(db, v);
      return json(await getOrder(db, id));
    }
    if (action === 'receipt') {
      await rate(db, `receipt:${ipHash}`, 20, 3600);
      const id = await authorizedOrder(db, v);
      const { bytes, type, ext } = decodeFile(v);
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const upload = await db.storage
        .from('payment-receipts')
        .upload(path, bytes, { contentType: type, upsert: false });
      dbError(upload.error);
      const result = await db.rpc('submit_receipt', {
        p_order: id,
        p_path: path,
        p_type: type,
        p_size: bytes.length,
      });
      if (result.error) {
        await db.storage.from('payment-receipts').remove([path]);
        dbError(result.error);
      }
      await notify();
      return json({ ok: true, status: 'Payment Verification Pending' });
    }
    if (action === 'review') {
      await rate(db, `review:${ipHash}`, 20, 3600);
      const id = await authorizedOrder(db, v);
      if (
        !isUuid(v.productId) ||
        !Number.isInteger(v.rating) ||
        Number(v.rating) < 1 ||
        Number(v.rating) > 5 ||
        typeof v.body !== 'string' ||
        v.body.trim().length < 10 ||
        v.body.length > 1500
      )
        throw new HttpError(
          400,
          'Please choose a rating and write 10–1500 characters.',
        );
      const result = await db.rpc('submit_review', {
        p_order: id,
        p_product: v.productId,
        p_rating: v.rating,
        p_body: v.body.trim(),
      });
      dbError(result.error);
      await notify();
      return json({ ok: true });
    }
    if (action === 'subscribe') {
      await rate(db, `subscribe:${ipHash}`, 10, 3600);
      if (
        typeof v.email !== 'string' ||
        v.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)
      )
        throw new HttpError(400, 'Please enter a valid email address.');
      const result = await db.from('newsletter_subscribers').upsert(
        {
          email: v.email.trim().toLowerCase(),
          unsubscribe_hash: await hash(crypto.randomUUID()),
        },
        { onConflict: 'email', ignoreDuplicates: true },
      );
      dbError(result.error);
      return json({ ok: true });
    }
    if (action === 'unsubscribe') {
      if (
        typeof v.email !== 'string' ||
        typeof v.token !== 'string' ||
        v.token.length > 200
      )
        throw new HttpError(400, 'Invalid unsubscribe link.');
      await rate(db, `unsubscribe:${ipHash}`, 20, 3600);
      const result = await db
        .from('newsletter_subscribers')
        .delete()
        .eq('email', v.email)
        .eq('unsubscribe_hash', await hash(v.token));
      dbError(result.error);
      return json({ ok: true });
    }
    // Every administrative action validates the JWT against Auth, then checks the live admin table.
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) throw new HttpError(401, 'Administrator sign-in required.');
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user)
      throw new HttpError(
        401,
        'Your session has expired. Please sign in again.',
      );
    const { data: admin, error: adminError } = await db
      .from('admin_users')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    dbError(adminError);
    if (!admin)
      throw new HttpError(
        403,
        'This account is not an authorized administrator.',
      );
    const actor = auth.user.id;
    if (action === 'admin-snapshot') {
      const query = db
        .from('orders')
        .select(
          `${orderFields},payment_receipts(*),payments(*),order_history(*)`,
        )
        .order('created_at', { ascending: false })
        .limit(500);
      if (typeof v.reference === 'string' && v.reference)
        query.ilike(
          'reference',
          `%${v.reference.replace(/[^a-zA-Z0-9-]/g, '')}%`,
        );
      if (
        ['awaiting', 'pending', 'confirmed', 'rejected'].includes(
          String(v.payment),
        )
      )
        query.eq('payment_status', v.payment);
      if (typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
        query.gte('created_at', `${v.date}T00:00:00+01:00`);
        query.lte('created_at', `${v.date}T23:59:59.999+01:00`);
      }
      const [p, o, r, n, s, stats, subscribers] = await Promise.all([
        db
          .from('products')
          .select(
            '*,category:categories(*),combo_items:combo_items!combo_items_combo_id_fkey(product_id,quantity),images:product_images(*)',
          )
          .order('created_at', { ascending: false }),
        query,
        db
          .from('product_reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        db
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        db.from('website_settings').select('*').eq('id', 1).single(),
        db.rpc('admin_stats'),
        db
          .from('newsletter_subscribers')
          .select('email,created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);
      for (const result of [p, o, r, n, s, stats, subscribers])
        dbError(result.error);
      return json({
        products: p.data,
        orders: o.data,
        reviews: r.data,
        notifications: n.data,
        settings: s.data,
        stats: stats.data,
        subscribers: subscribers.data,
        emailConfigured: !!(
          env.RESEND_API_KEY &&
          env.ADMIN_NOTIFICATION_EMAIL &&
          env.NOTIFICATION_FROM
        ),
      });
    }
    if (action === 'admin-product-save') {
      const p = v.product as Record<string, unknown>,
        components = v.components as { product_id: string; quantity: number }[];
      if (
        !p ||
        typeof p.name !== 'string' ||
        p.name.trim().length < 2 ||
        p.name.length > 150 ||
        typeof p.slug !== 'string' ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) ||
        !isUuid(p.category_id) ||
        typeof p.description !== 'string' ||
        p.description.length > 10000 ||
        Number(p.price) <= 0 ||
        !Number.isFinite(Number(p.price)) ||
        !Number.isInteger(p.stock) ||
        Number(p.stock) < 0 ||
        !Number.isInteger(p.low_stock_threshold) ||
        Number(p.low_stock_threshold) < 0 ||
        !Array.isArray(p.notes) ||
        p.notes.length > 20 ||
        p.notes.some((n) => typeof n !== 'string' || n.length > 100) ||
        !validImageUrl(p.image_url) ||
        typeof p.size !== 'string' ||
        p.size.length > 100 ||
        !['available', 'published', 'featured', 'bestseller'].every(
          (k) => typeof p[k] === 'boolean',
        ) ||
        !Array.isArray(components) ||
        components.length > 30 ||
        components.some(
          (c) =>
            !isUuid(c.product_id) ||
            !Number.isInteger(c.quantity) ||
            c.quantity < 1 ||
            c.quantity > 50,
        )
      )
        throw new HttpError(
          400,
          'Check the product details, image URL, price and stock.',
        );
      if (p.id && !isUuid(p.id)) throw new HttpError(400, 'Invalid product.');
      if (
        p.discount_price !== null &&
        (!Number.isFinite(Number(p.discount_price)) ||
          Number(p.discount_price) <= 0 ||
          Number(p.discount_price) >= Number(p.price))
      )
        throw new HttpError(
          400,
          'The sale price must be positive and below the regular price.',
        );
      const result = await db.rpc('save_product', {
        p_data: p,
        p_components: components,
      });
      dbError(result.error);
      await notify();
      return json({ id: result.data });
    }
    if (action === 'admin-product-delete') {
      if (!isUuid(v.id)) throw new HttpError(400, 'Invalid product.');
      const result = await db.from('products').delete().eq('id', v.id);
      if (result.error?.code === '23503')
        throw new HttpError(
          409,
          'This product belongs to an order or bundle. Unpublish it to preserve order history.',
        );
      dbError(result.error);
      return json({ ok: true });
    }
    if (action === 'admin-image') {
      const { bytes, type, ext } = decodeFile(v, true);
      const path = `${crypto.randomUUID()}.${ext}`;
      const result = await db.storage
        .from('product-images')
        .upload(path, bytes, { contentType: type });
      dbError(result.error);
      const imageUrl = db.storage.from('product-images').getPublicUrl(path)
        .data.publicUrl;
      if (v.productId) {
        if (!isUuid(v.productId)) throw new HttpError(400, 'Invalid product.');
        const save = await db.from('product_images').insert({
          product_id: v.productId,
          url: imageUrl,
          alt:
            typeof v.alt === 'string'
              ? v.alt.slice(0, 200)
              : 'Fragrance product',
        });
        dbError(save.error);
      }
      return json({ url: imageUrl });
    }
    if (action === 'admin-gallery-delete') {
      if (!isUuid(v.id)) throw new HttpError(400, 'Invalid image.');
      const result = await db.from('product_images').delete().eq('id', v.id);
      dbError(result.error);
      return json({ ok: true });
    }
    if (action === 'admin-order') {
      if (
        !isUuid(v.id) ||
        typeof v.status !== 'string' ||
        ![
          'confirm',
          'reject',
          'Processing',
          'Ready for Delivery',
          'Delivered',
          'Cancelled',
        ].includes(v.status)
      )
        throw new HttpError(400, 'Invalid order action.');
      const result = await db.rpc('manage_order', {
        p_order: v.id,
        p_action: v.status,
        p_actor: actor,
        p_note: typeof v.note === 'string' ? v.note.slice(0, 1000) : '',
      });
      dbError(result.error);
      await notify();
      return json({ ok: true });
    }
    if (action === 'admin-receipt') {
      if (!isUuid(v.id)) throw new HttpError(400, 'Invalid receipt.');
      const { data, error } = await db
        .from('payment_receipts')
        .select('path')
        .eq('id', v.id)
        .single();
      dbError(error);
      if (!data) throw new HttpError(404, 'Receipt not found.');
      const result = await db.storage
        .from('payment-receipts')
        .createSignedUrl(data.path, 120, { download: true });
      dbError(result.error);
      return json({ url: result.data?.signedUrl });
    }
    if (action === 'admin-review') {
      if (
        !isUuid(v.id) ||
        !['approve', 'hide', 'delete'].includes(String(v.operation))
      )
        throw new HttpError(400, 'Invalid review action.');
      const result =
        v.operation === 'delete'
          ? await db.from('product_reviews').delete().eq('id', v.id)
          : await db
              .from('product_reviews')
              .update({ approved: v.operation === 'approve' })
              .eq('id', v.id);
      dbError(result.error);
      return json({ ok: true });
    }
    if (action === 'admin-settings') {
      const s = v.settings as Record<string, unknown>;
      const keys = [
        'brand_name',
        'slogan',
        'whatsapp',
        'bank_name',
        'account_name',
        'account_number',
        'contact_email',
        'instagram',
        'address',
        'delivery_info',
        'promo_title',
        'promo_text',
      ];
      if (
        !s ||
        keys.some(
          (k) => typeof s[k] !== 'string' || String(s[k]).length > 5000,
        ) ||
        !Number.isFinite(Number(s.delivery_fee)) ||
        Number(s.delivery_fee) < 0
      )
        throw new HttpError(400, 'Check your website settings.');
      if (s.account_number && !/^\d{10}$/.test(String(s.account_number)))
        throw new HttpError(
          400,
          'Bank account numbers must contain 10 digits.',
        );
      if (s.whatsapp && !/^\d{10,15}$/.test(normalizePhone(String(s.whatsapp))))
        throw new HttpError(400, 'Please enter a valid WhatsApp number.');
      if (
        s.instagram &&
        (!validImageUrl(s.instagram) ||
          !['instagram.com', 'www.instagram.com'].includes(
            new URL(String(s.instagram)).hostname,
          ))
      )
        throw new HttpError(400, 'Enter a valid Instagram profile URL.');
      if (
        s.contact_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.contact_email))
      )
        throw new HttpError(400, 'Enter a valid contact email.');
      const update = Object.fromEntries(
        keys.map((k) => [
          k,
          k === 'whatsapp' ? normalizePhone(String(s[k])) : String(s[k]).trim(),
        ]),
      );
      const result = await db
        .from('website_settings')
        .update({ ...update, delivery_fee: Number(s.delivery_fee) })
        .eq('id', 1);
      dbError(result.error);
      return json({ ok: true });
    }
    if (action === 'admin-notifications') {
      const result = await db
        .from('notifications')
        .update({ attempts: 0, locked_until: null })
        .is('sent_at', null)
        .gte('attempts', 10);
      dbError(result.error);
      return json(await dispatch(db, env));
    }
    throw new HttpError(404, 'Unknown action.');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (
      e instanceof Error &&
      /Please check your order reference/.test(e.message)
    )
      return json({ error: e.message }, 400);
    console.error(
      'Store request failed:',
      e instanceof Error ? e.name : 'unknown',
    );
    return json(
      { error: 'We couldn’t complete this request. Please try again.' },
      500,
    );
  }
}
