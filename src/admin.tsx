import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Save,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { api, money, supabase } from './lib';
import { useStore } from './store';
import { Loading, Stars } from './components';
import type { Notification, Order, Product, Review, Settings } from './types';
import './admin.css';
import { BrandLogo } from './BrandLogo';
type AdminOrder = Order & {
  payments: { id: string; action: string; note: string; created_at: string }[];
  order_history: {
    id: string;
    status: string;
    note: string;
    created_at: string;
  }[];
};
type Snapshot = {
  products: Product[];
  orders: AdminOrder[];
  reviews: Review[];
  notifications: Notification[];
  settings: Settings;
  stats: Record<string, number>;
  subscribers: { email: string; created_at: string }[];
  emailConfigured: boolean;
};
const tabs = [
  ['overview', 'Overview', LayoutDashboard],
  ['products', 'Products & inventory', Package],
  ['orders', 'Orders & payments', ShoppingBag],
  ['reviews', 'Customer reviews', Star],
  ['notifications', 'Notifications', Bell],
  ['settings', 'Website settings', SettingsIcon],
] as const;
function Login() {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [mode, setMode] = useState<'login' | 'reset'>('login');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('The store is not connected.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/admin`,
        });
        if (result.error) throw result.error;
        setError(
          'If this account exists, a password reset link has been requested. Check your email.',
        );
      } else {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (result.error) throw result.error;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-login">
      <Link className="admin-back" to="/">
        <ArrowLeft size={16} /> Back to boutique
      </Link>
      <form onSubmit={submit}>
        <BrandLogo className="studio-mark" />
        <p className="eyebrow">Michael’s Scentsation / Studio</p>
        <h1>{mode === 'reset' ? 'A fresh start.' : 'Welcome back.'}</h1>
        <p>Private access for authorized administrators.</p>
        <label>
          Email address
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === 'login' && (
          <label>
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'reset'
              ? 'Send reset link'
              : 'Sign in to the studio'}
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === 'login' ? 'reset' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Forgot your password?' : 'Back to sign in'}
        </button>
        <p className="admin-login-note">
          Admin accounts are assigned by the project owner. Signing in with
          another account does not grant access.
        </p>
      </form>
    </main>
  );
}
function PasswordRecovery({ done }: { done: () => void }) {
  const [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main className="admin-login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const result = await supabase!.auth.updateUser({ password });
          if (result.error) setError(result.error.message);
          else done();
          setBusy(false);
        }}
      >
        <p className="eyebrow">Michael’s Scentsation / Studio</p>
        <BrandLogo className="studio-mark" />
        <h1>Your new password.</h1>
        <label>
          Password
          <input
            type="password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <p className="small">Use at least 12 characters.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="button" disabled={busy}>
          Save password <Save size={16} />
        </button>
      </form>
    </main>
  );
}
const emptyProduct = {
  name: '',
  slug: '',
  description: '',
  category_id: '',
  price: 0,
  discount_price: null,
  stock: 0,
  available: true,
  published: false,
  featured: false,
  bestseller: false,
  image_url: '',
  size: '',
  notes: [],
  low_stock_threshold: 3,
} as Partial<Product>;
async function uploadImage(file: File, productId?: string) {
  if (file.size > 3145728 || !['image/jpeg', 'image/png'].includes(file.type))
    throw new Error('Choose a JPG or PNG up to 3 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return api<{ url: string }>(
    'admin-image',
    { file: btoa(binary), type: file.type, productId },
    true,
  );
}
export default function Admin() {
  const [session, setSession] = useState<Session | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [recovery, setRecovery] = useState(false),
    [tab, setTab] = useState('overview'),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [product, setProduct] = useState<Partial<Product> | null>(null),
    [components, setComponents] = useState<
      { product_id: string; quantity: number }[]
    >([]),
    [order, setOrder] = useState<AdminOrder | null>(null),
    [productQuery, setProductQuery] = useState(''),
    [filters, setFilters] = useState({ reference: '', payment: '', date: '' }),
    [settings, setSettings] = useState<Settings | null>(null),
    [note, setNote] = useState('');
  const { categories, refresh, toast } = useStore();
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then((r) => {
      setSession(r.data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function load(query = filters) {
    setBusy(true);
    setError('');
    try {
      const result = await api<Snapshot>('admin-snapshot', query, true);
      setSnapshot(result);
      setSettings(result.settings);
      if (order) setOrder(result.orders.find((o) => o.id === order.id) || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (session && !recovery) void load();
  }, [session?.user.id, recovery]);
  async function action(name: string, data: unknown) {
    setBusy(true);
    try {
      await api(name, data, true);
      toast('Changes saved.');
      await load();
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function orderAction(status: string) {
    if (!order) return;
    await action('admin-order', { id: order.id, status, note });
    setNote('');
  }
  useEffect(() => {
    if (!product && !order) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary',
        ) || [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProduct(null);
        setOrder(null);
      }
      if (event.key === 'Tab') {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [!!product, !!order]);
  if (authLoading) return <Loading />;
  if (recovery) return <PasswordRecovery done={() => setRecovery(false)} />;
  if (!session) return <Login />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="studio-logo" to="/">
          <BrandLogo />
        </Link>
        <nav aria-label="Admin navigation">
          {tabs.map(([id, label, Icon]) => (
            <button
              className={tab === id ? 'active' : ''}
              key={id}
              onClick={() => {
                setTab(id);
                setOrder(null);
                setProduct(null);
              }}
            >
              <Icon size={17} />
              {label}
              {id === 'orders' && !!snapshot?.stats.pending_verifications && (
                <b>{snapshot.stats.pending_verifications}</b>
              )}
            </button>
          ))}
        </nav>
        <Link className="admin-store-link" to="/">
          <ExternalLink size={15} /> View boutique
        </Link>
        <button
          className="admin-signout"
          onClick={async () => {
            await supabase?.auth.signOut();
            setSnapshot(null);
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Your boutique, thoughtfully managed</p>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </header>
        {error && (
          <div className="admin-error" role="alert">
            <h3>We couldn’t open the studio.</h3>
            <p>{error}</p>
            <p>
              Administrator access must be assigned in Supabase before this
              account can manage the store.
            </p>
          </div>
        )}
        {!snapshot && !error && <Loading />}
        {snapshot && (
          <>
            {tab === 'overview' && (
              <>
                <div className="admin-welcome">
                  <p className="eyebrow">A considered view</p>
                  <h2>A little clarity for your day.</h2>
                  <p>
                    Payment receipts need your review. Inventory is allocated
                    only when you confirm payment.
                  </p>
                </div>
                <div className="stat-grid">
                  {[
                    ['Total products', 'total_products'],
                    ['Available products', 'available_products'],
                    ['Sold-out products', 'sold_out_products'],
                    ['Total orders', 'total_orders'],
                    ['Pending orders', 'pending_orders'],
                    ['Payment verifications', 'pending_verifications'],
                    ['Confirmed payments', 'confirmed_payments'],
                    ['Total sales', 'total_sales'],
                  ].map(([label, key]) => (
                    <div className="stat-card" key={key}>
                      <span>{label}</span>
                      <strong>
                        {key === 'total_sales'
                          ? money(snapshot.stats[key] || 0)
                          : snapshot.stats[key] || 0}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="admin-two-column">
                  <section className="panel">
                    <h3>Needs your attention</h3>
                    <p>
                      {snapshot.stats.pending_verifications || 0} payment
                      receipt(s) awaiting verification.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => {
                        setFilters({ ...filters, payment: 'pending' });
                        setTab('orders');
                        void load({ ...filters, payment: 'pending' });
                      }}
                    >
                      Review payments <ArrowRight size={15} />
                    </button>
                    <div className="low-stock-list">
                      {snapshot.products
                        .filter((p) => p.stock <= p.low_stock_threshold)
                        .map((p) => (
                          <div key={p.id}>
                            <span>{p.name}</span>
                            <b>{p.stock} left</b>
                          </div>
                        ))}
                    </div>
                  </section>
                  <section className="panel">
                    <h3>Before you open</h3>
                    {[
                      [
                        !!snapshot.settings.bank_name &&
                          !!snapshot.settings.account_number,
                        'Bank transfer details',
                      ],
                      [
                        !!snapshot.settings.delivery_info,
                        'Delivery information',
                      ],
                      [!!snapshot.settings.whatsapp, 'Business WhatsApp'],
                      [snapshot.emailConfigured, 'Resend order notifications'],
                      [
                        snapshot.products.some((p) => p.published),
                        'A published collection',
                      ],
                    ].map(([ready, label]) => (
                      <div key={String(label)} className="readiness-row">
                        <span className={ready ? 'ready' : ''}>
                          {ready ? <Check size={13} /> : <X size={13} />}
                        </span>
                        {label}
                      </div>
                    ))}
                    <button
                      className="text-link"
                      onClick={() => setTab('settings')}
                    >
                      Manage settings <ArrowRight size={15} />
                    </button>
                  </section>
                </div>
              </>
            )}
            {tab === 'products' && (
              <>
                <div className="admin-toolbar">
                  <div className="admin-search">
                    <Search size={17} />
                    <input
                      placeholder="Search products…"
                      aria-label="Search products"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                    />
                  </div>
                  <button
                    className="button"
                    onClick={() => {
                      setProduct({
                        ...emptyProduct,
                        category_id: categories[0]?.id || '',
                      });
                      setComponents([]);
                    }}
                  >
                    <Plus size={16} /> Add product
                  </button>
                </div>
                <div
                  className="admin-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Products and inventory table"
                >
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Fragrance</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.products
                        .filter((p) =>
                          p.name
                            .toLowerCase()
                            .includes(productQuery.toLowerCase()),
                        )
                        .map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="table-product">
                                <img
                                  src={p.image_url || '/images/hero.jpg'}
                                  alt=""
                                />
                                <span>
                                  <strong>{p.name}</strong>
                                  <small>{p.category?.name}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              {money(p.discount_price ?? p.price)}
                              {p.discount_price && <del>{money(p.price)}</del>}
                            </td>
                            <td>
                              <span
                                className={
                                  p.stock <= p.low_stock_threshold
                                    ? 'low-stock'
                                    : ''
                                }
                              >
                                {p.stock}
                              </span>
                            </td>
                            <td>
                              <span className="status-badge">
                                {!p.published
                                  ? 'Draft'
                                  : !p.available || !p.stock
                                    ? 'Sold out'
                                    : 'Published'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setProduct({ ...p });
                                  setComponents(p.combo_items || []);
                                }}
                              >
                                Edit <ArrowRight size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!snapshot.products.length && (
                    <div className="admin-empty">
                      <Package size={28} />
                      <h3>Your collection starts here.</h3>
                      <p>
                        Add your first fragrance. Products stay in draft until
                        you publish them.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {tab === 'orders' && (
              <>
                <form
                  className="admin-toolbar order-filters"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void load(filters);
                  }}
                >
                  <input
                    aria-label="Search order reference"
                    placeholder="Search reference…"
                    value={filters.reference}
                    onChange={(e) =>
                      setFilters({ ...filters, reference: e.target.value })
                    }
                  />
                  <select
                    aria-label="Filter payment status"
                    value={filters.payment}
                    onChange={(e) =>
                      setFilters({ ...filters, payment: e.target.value })
                    }
                  >
                    <option value="">All payments</option>
                    <option value="awaiting">Awaiting payment</option>
                    <option value="pending">Verification pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    type="date"
                    aria-label="Filter order date"
                    value={filters.date}
                    onChange={(e) =>
                      setFilters({ ...filters, date: e.target.value })
                    }
                  />
                  <button className="button secondary" disabled={busy}>
                    Filter
                  </button>
                </form>
                <div
                  className="admin-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Orders and payments table"
                >
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.reference}</strong>
                          </td>
                          <td>{o.customer_name}</td>
                          <td>{money(o.total)}</td>
                          <td>
                            <span
                              className={`status-badge status-${o.payment_status}`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td>
                            {new Date(o.created_at).toLocaleDateString('en-NG')}
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => {
                                setOrder(o);
                                setNote('');
                              }}
                            >
                              View <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!snapshot.orders.length && (
                    <div className="admin-empty">
                      <ShoppingBag size={28} />
                      <h3>No orders to show.</h3>
                      <p>Orders matching your filters will appear here.</p>
                    </div>
                  )}
                </div>
                <p className="muted small admin-limit">
                  Showing the latest 500 matching orders. Use the date and
                  reference filters to find older orders.
                </p>
              </>
            )}
            {tab === 'reviews' && (
              <>
                <div className="admin-review-grid">
                  {snapshot.reviews.map((r) => (
                    <article className="panel" key={r.id}>
                      <div className="review-admin-top">
                        <Stars value={r.rating} />
                        <span className="status-badge">
                          {r.approved
                            ? 'Published'
                            : 'Hidden / awaiting review'}
                        </span>
                      </div>
                      <h3>
                        {
                          snapshot.products.find((p) => p.id === r.product_id)
                            ?.name
                        }
                      </h3>
                      <p>{r.body}</p>
                      <small>
                        {r.customer_name} ·{' '}
                        {new Date(r.created_at).toLocaleDateString('en-NG')} ·
                        Verified purchase
                      </small>
                      <div className="admin-review-actions">
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void action('admin-review', {
                              id: r.id,
                              operation: r.approved ? 'hide' : 'approve',
                            })
                          }
                        >
                          {r.approved ? 'Hide review' : 'Approve review'}
                        </button>
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm('Permanently delete this review?')
                            )
                              void action('admin-review', {
                                id: r.id,
                                operation: 'delete',
                              });
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!snapshot.reviews.length && (
                  <div className="admin-empty">
                    <Star size={28} />
                    <h3>No reviews yet.</h3>
                    <p>
                      Reviews from confirmed purchases will arrive here for
                      moderation.
                    </p>
                  </div>
                )}
              </>
            )}
            {tab === 'notifications' && (
              <>
                <section className="panel notification-info">
                  <h3>
                    {snapshot.emailConfigured
                      ? 'Email notifications are connected.'
                      : 'Connect email notifications.'}
                  </h3>
                  <p>
                    {snapshot.emailConfigured
                      ? 'Order events are saved first, then delivered through Resend. Failed deliveries can be retried.'
                      : 'Order events are being saved here. Add RESEND_API_KEY, NOTIFICATION_FROM and ADMIN_NOTIFICATION_EMAIL as Supabase Edge Function secrets to enable email delivery.'}
                  </p>
                  <button
                    className="button secondary"
                    disabled={busy || !snapshot.emailConfigured}
                    onClick={() => void action('admin-notifications', {})}
                  >
                    Send pending notifications <ArrowRight size={15} />
                  </button>
                </section>
                <div className="panel notification-list">
                  {snapshot.notifications.map((n) => (
                    <div key={n.id}>
                      <Bell size={17} />
                      <div>
                        <strong>{n.kind.replaceAll('_', ' ')}</strong>
                        <p>
                          {snapshot.orders.find((o) => o.id === n.order_id)
                            ?.reference ||
                            String(n.payload.name || 'Store update')}
                        </p>
                        <small>
                          {new Date(n.created_at).toLocaleString('en-NG')}
                        </small>
                        {n.last_error && (
                          <p className="form-error">{n.last_error}</p>
                        )}
                      </div>
                      <span className="status-badge">
                        {n.sent_at ? 'Emailed' : 'Saved in dashboard'}
                      </span>
                    </div>
                  ))}
                  {!snapshot.notifications.length && (
                    <p>No notifications yet.</p>
                  )}
                </div>
                <section className="panel">
                  <h3>
                    Newsletter subscribers ({snapshot.subscribers.length})
                  </h3>
                  <p>
                    Subscriptions are saved with consent from the storefront
                    form. Only send marketing emails to these subscribers with
                    an unsubscribe link.
                  </p>
                  <details>
                    <summary>View subscribers</summary>
                    <div className="subscriber-list">
                      {snapshot.subscribers.map((s) => (
                        <p key={s.email}>
                          {s.email}{' '}
                          <small>
                            {new Date(s.created_at).toLocaleDateString('en-NG')}
                          </small>
                        </p>
                      ))}
                    </div>
                  </details>
                </section>
              </>
            )}
            {tab === 'settings' && settings && (
              <form
                className="settings-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action('admin-settings', { settings });
                }}
              >
                <div className="panel">
                  <h2>The essentials</h2>
                  <div className="settings-grid">
                    {[
                      ['brand_name', 'Brand name'],
                      ['slogan', 'Brand slogan'],
                      ['whatsapp', 'WhatsApp Business number'],
                      ['contact_email', 'Contact email'],
                      ['instagram', 'Instagram profile URL'],
                      ['address', 'Business address'],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type={
                            key === 'contact_email'
                              ? 'email'
                              : key === 'instagram'
                                ? 'url'
                                : 'text'
                          }
                          value={String(settings[key as keyof Settings])}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                          placeholder={
                            key === 'whatsapp' ? '08012345678 or +234…' : ''
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <h2>Bank transfer details</h2>
                  <p>
                    These details appear during checkout. An empty account keeps
                    new orders closed.
                  </p>
                  <div className="settings-grid">
                    {[
                      ['bank_name', 'Bank name'],
                      ['account_name', 'Account name'],
                      ['account_number', 'Account number'],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          value={String(settings[key as keyof Settings])}
                          pattern={
                            key === 'account_number' ? '[0-9]{10}' : undefined
                          }
                          maxLength={key === 'account_number' ? 10 : 150}
                          onChange={(e) =>
                            setSettings({ ...settings, [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <h2>Delivery & offers</h2>
                  <label>
                    Delivery fee (₦)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={settings.delivery_fee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          delivery_fee: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Delivery areas, timelines & return terms
                    <textarea
                      rows={5}
                      value={settings.delivery_info}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          delivery_info: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Promotional headline
                    <input
                      value={settings.promo_title}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          promo_title: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Promotional description
                    <textarea
                      value={settings.promo_text}
                      onChange={(e) =>
                        setSettings({ ...settings, promo_text: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="button" disabled={busy}>
                  <Save size={16} />
                  {busy ? 'Saving…' : 'Save website settings'}
                </button>
              </form>
            )}
          </>
        )}
        {product && (
          <div
            className="admin-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setProduct(null);
            }}
          >
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Product editor"
            >
              <header>
                <div>
                  <p className="eyebrow">The collection</p>
                  <h2>{product.id ? 'Edit fragrance' : 'Add a fragrance'}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close editor"
                  onClick={() => setProduct(null)}
                >
                  <X size={20} />
                </button>
              </header>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await api(
                      'admin-product-save',
                      { product, components },
                      true,
                    );
                    setProduct(null);
                    await load();
                    await refresh();
                    toast('Fragrance saved.');
                  } catch (e) {
                    toast((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="settings-grid">
                  <label>
                    Product name
                    <input
                      required
                      value={product.name}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          name: e.target.value,
                          ...(!product.id
                            ? {
                                slug: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, '-')
                                  .replace(/^-|-$/g, ''),
                              }
                            : {}),
                        })
                      }
                    />
                  </label>
                  <label>
                    URL slug
                    <input
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      value={product.slug}
                      onChange={(e) =>
                        setProduct({ ...product, slug: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={product.category_id}
                      required
                      onChange={(e) => {
                        setProduct({ ...product, category_id: e.target.value });
                        setComponents([]);
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Size / volume
                    <input
                      value={product.size}
                      onChange={(e) =>
                        setProduct({ ...product, size: e.target.value })
                      }
                      placeholder="e.g. 100 ml"
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    required
                    value={product.description}
                    onChange={(e) =>
                      setProduct({ ...product, description: e.target.value })
                    }
                    rows={4}
                  />
                </label>
                <div className="settings-grid">
                  <label>
                    Regular price (₦)
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={product.price || ''}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          price: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Discount price (optional)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={(product.price || 0) - 0.01}
                      value={product.discount_price ?? ''}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          discount_price: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Stock quantity
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={product.stock}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          stock: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Low stock threshold
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={product.low_stock_threshold}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          low_stock_threshold: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Fragrance notes (comma separated)
                  <input
                    value={product.notes?.join(', ')}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        notes: e.target.value.split(',').map((n) => n.trim()),
                      })
                    }
                    placeholder="Amber, oud, vanilla"
                  />
                </label>
                <label>
                  Product image URL
                  <input
                    type="url"
                    required
                    value={product.image_url}
                    onChange={(e) =>
                      setProduct({ ...product, image_url: e.target.value })
                    }
                  />
                </label>
                {product.image_url && (
                  <img
                    className="editor-preview"
                    src={product.image_url}
                    alt="Product preview"
                  />
                )}
                <label className="admin-upload">
                  <Upload size={16} />{' '}
                  {busy
                    ? 'Uploading…'
                    : 'Upload primary image (JPG / PNG, up to 3 MB)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const result = await uploadImage(file);
                        setProduct({ ...product, image_url: result.url });
                        toast('Image uploaded.');
                      } catch (e) {
                        toast((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                {product.id && (
                  <details className="gallery-editor">
                    <summary>Additional product images</summary>
                    <div className="admin-gallery">
                      {product.images?.map((img) => (
                        <div key={img.id}>
                          <img src={img.url} alt={img.alt} />
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Delete image"
                            onClick={async () => {
                              await action('admin-gallery-delete', {
                                id: img.id,
                              });
                              setProduct({
                                ...product,
                                images: product.images?.filter(
                                  (i) => i.id !== img.id,
                                ),
                              });
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="admin-upload">
                      <Plus size={15} /> Add gallery image
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={busy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusy(true);
                          try {
                            await uploadImage(file, product.id);
                            toast(
                              'Gallery image uploaded. Reopen the editor to see it.',
                            );
                            await load();
                          } catch (e) {
                            toast((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </label>
                  </details>
                )}
                {categories.find((c) => c.id === product.category_id)?.slug ===
                  'combos' && (
                  <section className="bundle-editor">
                    <h3>Bundle contents</h3>
                    <p className="muted small">
                      Component stock is deducted with the bundle on payment
                      confirmation.
                    </p>
                    {components.map((c, i) => (
                      <div key={i}>
                        <select
                          aria-label="Bundle component"
                          required
                          value={c.product_id}
                          onChange={(e) =>
                            setComponents(
                              components.map((c, j) =>
                                j === i
                                  ? { ...c, product_id: e.target.value }
                                  : c,
                              ),
                            )
                          }
                        >
                          <option value="">Choose fragrance</option>
                          {snapshot?.products
                            .filter(
                              (p) =>
                                p.id !== product.id && !p.combo_items?.length,
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        <input
                          aria-label="Component quantity"
                          type="number"
                          min="1"
                          max="50"
                          required
                          value={c.quantity}
                          onChange={(e) =>
                            setComponents(
                              components.map((c, j) =>
                                j === i
                                  ? { ...c, quantity: Number(e.target.value) }
                                  : c,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label="Remove component"
                          onClick={() =>
                            setComponents(components.filter((_, j) => j !== i))
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setComponents([
                          ...components,
                          { product_id: '', quantity: 1 },
                        ])
                      }
                    >
                      <Plus size={14} /> Add component
                    </button>
                  </section>
                )}
                <div className="product-toggles">
                  {[
                    ['available', 'Available for purchase'],
                    ['published', 'Publish in the store'],
                    ['featured', 'Feature on homepage'],
                    ['bestseller', 'Mark as best seller'],
                  ].map(([key, label]) => (
                    <label className="checkbox" key={key}>
                      <input
                        type="checkbox"
                        checked={!!product[key as keyof Product]}
                        onChange={(e) =>
                          setProduct({ ...product, [key]: e.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <footer className="editor-footer">
                  {product.id && (
                    <button
                      type="button"
                      className="text-button danger"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          window.confirm(
                            'Delete this product? Products with orders or bundle references must be unpublished instead.',
                          )
                        ) {
                          try {
                            await api(
                              'admin-product-delete',
                              { id: product.id },
                              true,
                            );
                            setProduct(null);
                            await load();
                            await refresh();
                            toast('Product deleted.');
                          } catch (e) {
                            toast((e as Error).message);
                          }
                        }
                      }}
                    >
                      <Trash2 size={15} /> Delete product
                    </button>
                  )}
                  <button className="button" disabled={busy}>
                    <Save size={15} /> {busy ? 'Saving…' : 'Save fragrance'}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
        {order && (
          <div
            className="admin-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOrder(null);
            }}
          >
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Order details"
            >
              <header>
                <div>
                  <p className="eyebrow">Order details</p>
                  <h2>{order.reference}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close order"
                  onClick={() => setOrder(null)}
                >
                  <X size={20} />
                </button>
              </header>
              <span className={`status-badge status-${order.payment_status}`}>
                {order.status}
              </span>
              <section className="admin-order-customer">
                <h3>{order.customer_name}</h3>
                <p>
                  {order.email}
                  <br />
                  {order.phone}
                  <br />
                  {order.address}
                </p>
                {order.instructions && (
                  <p>Instructions: {order.instructions}</p>
                )}
              </section>
              <div className="admin-order-items">
                {order.order_items.map((i) => (
                  <div key={i.id}>
                    <span>
                      {i.name} × {i.quantity}
                    </span>
                    <strong>{money(i.unit_price * i.quantity)}</strong>
                  </div>
                ))}
                <div>
                  <span>Delivery</span>
                  <span>{money(order.delivery_fee)}</span>
                </div>
                <div>
                  <strong>Total</strong>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
              <section className="admin-receipts">
                <h3>Payment receipts</h3>
                {order.payment_receipts?.length ? (
                  order.payment_receipts.map((r) => (
                    <button
                      className="button secondary"
                      disabled={busy}
                      key={r.id}
                      onClick={async () => {
                        try {
                          const result = await api<{ url: string }>(
                            'admin-receipt',
                            { id: r.id },
                            true,
                          );
                          window.location.assign(result.url);
                        } catch (e) {
                          toast((e as Error).message);
                        }
                      }}
                    >
                      <ExternalLink size={14} /> Download receipt ·{' '}
                      {new Date(r.created_at).toLocaleDateString('en-NG')}
                    </button>
                  ))
                ) : (
                  <p className="muted small">No receipt submitted.</p>
                )}
              </section>
              <label>
                Internal note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Verification notes or delivery updates"
                />
              </label>
              <div className="order-admin-actions">
                {order.payment_status === 'pending' &&
                  order.status !== 'Cancelled' && (
                    <>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Confirm this bank transfer? Check your bank account first. Inventory will be deducted.',
                            )
                          )
                            void orderAction('confirm');
                        }}
                      >
                        Confirm payment <Check size={15} />
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void orderAction('reject')}
                      >
                        Reject receipt
                      </button>
                    </>
                  )}
                {order.payment_status === 'confirmed' &&
                  order.status !== 'Delivered' && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        void orderAction(
                          order.status === 'Payment Confirmed'
                            ? 'Processing'
                            : order.status === 'Processing'
                              ? 'Ready for Delivery'
                              : 'Delivered',
                        )
                      }
                    >
                      Mark{' '}
                      {order.status === 'Payment Confirmed'
                        ? 'Processing'
                        : order.status === 'Processing'
                          ? 'Ready for Delivery'
                          : 'Delivered'}
                      <ArrowRight size={15} />
                    </button>
                  )}
                {!['Cancelled', 'Delivered'].includes(order.status) &&
                  order.payment_status !== 'confirmed' && (
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('Cancel this unpaid order?'))
                          void orderAction('Cancelled');
                      }}
                    >
                      Cancel order
                    </button>
                  )}
              </div>
              <details className="history">
                <summary>Order & payment history</summary>
                {order.order_history?.map((h) => (
                  <p key={h.id}>
                    <strong>{h.status}</strong>
                    <br />
                    {h.note}
                    <br />
                    <small>
                      {new Date(h.created_at).toLocaleString('en-NG')}
                    </small>
                  </p>
                ))}
                {order.payments?.map((p) => (
                  <p key={p.id}>
                    Payment: {p.action}
                    <br />
                    {p.note}
                    <br />
                    <small>
                      {new Date(p.created_at).toLocaleString('en-NG')}
                    </small>
                  </p>
                ))}
              </details>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
