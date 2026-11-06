import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy as CopyIcon,
  FileUp,
  LockKeyhole,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { ButtonLink, Empty, PageIntro, Quantity } from './components';
import { BrandIcon } from './BrandIcon';
import { api, money, newToken, price, readLocal, whatsappUrl } from './lib';
import { useStore } from './store';
import type { Order } from './types';
type SavedOrder = { reference: string; token: string };
function useCart() {
  const store = useStore();
  const lines = store.cart.map((line) => ({
    ...line,
    product: store.products.find((p) => p.id === line.product_id),
  }));
  return {
    ...store,
    lines,
    subtotal: lines.reduce(
      (n, l) => n + (l.product ? price(l.product) * l.quantity : 0),
      0,
    ),
    invalid: lines.some(
      (l) => !l.product || !l.product.available || l.quantity > l.product.stock,
    ),
  };
}
export function Cart() {
  const { lines, subtotal, setQuantity, settings, invalid, loading } =
    useCart();
  if (loading) return <div className="loading">Loading your bag…</div>;
  return (
    <main className="container cart-page">
      <PageIntro eyebrow="Your selection" title="Your shopping bag." />
      {lines.length ? (
        <div className="cart-layout">
          <div>
            {lines.map((l) => (
              <div className="cart-line" key={l.product_id}>
                <img
                  src={l.product?.image_url || '/images/hero.jpg'}
                  alt={l.product?.name || 'Unavailable fragrance'}
                />
                <div>
                  <p className="eyebrow">{l.product?.category?.name}</p>
                  <h3>
                    {l.product ? (
                      <Link to={`/product/${l.product.slug}`}>
                        {l.product.name}
                      </Link>
                    ) : (
                      'Product no longer available'
                    )}
                  </h3>
                  <p>{l.product && money(price(l.product))}</p>
                  {l.product && (
                    <Quantity
                      value={l.quantity}
                      max={l.product.stock}
                      onChange={(n) => setQuantity(l.product_id, n)}
                    />
                  )}
                </div>
                <div className="cart-line-end">
                  <strong>
                    {l.product && money(price(l.product) * l.quantity)}
                  </strong>
                  <button
                    className="text-button"
                    onClick={() => setQuantity(l.product_id, 0)}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
            <Link className="text-link" to="/shop">
              <ArrowLeft size={16} /> Continue exploring
            </Link>
          </div>
          <aside className="order-summary">
            <p className="eyebrow">Made for your senses</p>
            <h2>Order summary</h2>
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{money(settings.delivery_fee)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(subtotal + settings.delivery_fee)}</strong>
            </div>
            {invalid ? (
              <p className="form-error">
                An item in your bag is no longer available in this quantity.
                Please update your bag.
              </p>
            ) : (
              <ButtonLink to="/checkout">Continue to checkout</ButtonLink>
            )}
            <small>
              <LockKeyhole size={13} /> Secure checkout · Bank transfer
            </small>
          </aside>
        </div>
      ) : (
        <Empty
          title="Your next signature is waiting."
          action={<ButtonLink to="/shop">Explore the collection</ButtonLink>}
        >
          Your shopping bag is empty. Let’s find a fragrance you’ll love.
        </Empty>
      )}
    </main>
  );
}
function Copy({ value, label = 'Copy' }: { value: string; label?: string }) {
  const { toast } = useStore();
  return (
    <button
      type="button"
      className="text-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast('Copied to clipboard.');
        } catch {
          toast('Couldn’t copy. Please select and copy the text.');
        }
      }}
    >
      <CopyIcon size={14} />
      {label}
    </button>
  );
}
function OrderView({
  order,
  token,
  onRefresh,
}: {
  order: Order;
  token: string;
  onRefresh: () => Promise<void>;
}) {
  const { settings, toast } = useStore();
  const [busy, setBusy] = useState(false),
    [reviewProduct, setReviewProduct] = useState(''),
    [rating, setRating] = useState(5),
    [body, setBody] = useState(''),
    [reviewBusy, setReviewBusy] = useState(false);
  const canPay =
    ['awaiting', 'rejected', 'pending'].includes(order.payment_status) &&
    order.status !== 'Cancelled';
  const message = `Hello MICHAEL'S SCENTSATION,\n\nI have just placed an order on your website.\n\nOrder Reference: ${order.reference}\nCustomer Name: ${order.customer_name}\nProducts Purchased: ${order.order_items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}\nTotal Amount: ${money(order.total)}\n\nI have uploaded my payment receipt on the website.\nKindly confirm receipt of payment and provide further delivery information.\n\nThank you.`;
  const wa = whatsappUrl(settings.whatsapp, message);
  async function upload(file: File) {
    setBusy(true);
    try {
      if (file.size > 3 * 1024 * 1024)
        throw new Error('Please choose a file smaller than 3 MB.');
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type))
        throw new Error('Choose a JPG, PNG or PDF receipt.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      await api('receipt', {
        reference: order.reference,
        token,
        file: btoa(binary),
        type: file.type,
      });
      await onRefresh();
      toast('Receipt submitted. Your payment is awaiting manual verification.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="order-view">
      <div className="order-success">
        <CheckCircle2 size={32} strokeWidth={1.2} />
        <div>
          <p className="eyebrow">Your fragrance journey</p>
          <h2>Order {order.reference}</h2>
          <span className={`status-badge status-${order.payment_status}`}>
            {order.status}
          </span>
        </div>
        <button className="text-button" onClick={() => void onRefresh()}>
          Refresh status
        </button>
      </div>
      <div className="private-code">
        <LockKeyhole size={18} />
        <div>
          <strong>Your private order access code</strong>
          <p>
            Keep this code safe. You’ll need it with your order reference to
            track your order and leave a review.
          </p>
          <code>{token}</code>
        </div>
        <Copy value={token} />
      </div>
      <div className="checkout-layout">
        <div>
          {canPay && (
            <section className="panel payment-panel">
              <p className="eyebrow">01 / Bank transfer</p>
              <h2>
                {order.payment_status === 'rejected'
                  ? 'Please check your payment.'
                  : 'Complete your payment.'}
              </h2>
              {order.payment_status === 'rejected' && (
                <p className="form-error">
                  Your previous receipt could not be verified. Please contact us
                  or submit a corrected receipt.
                </p>
              )}
              <p>
                Please transfer the exact order amount to the account details
                provided. After completing your transfer, upload your payment
                receipt for verification.
              </p>
              <dl className="bank-details">
                <div>
                  <dt>Bank name</dt>
                  <dd>{settings.bank_name || 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Account name</dt>
                  <dd>{settings.account_name || 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Account number</dt>
                  <dd className="account-number">
                    {settings.account_number || 'Not configured'}
                    {settings.account_number && (
                      <Copy value={settings.account_number} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Amount to transfer</dt>
                  <dd>{money(order.total)}</dd>
                </div>
              </dl>
              <p className="notice">
                Use <strong>{order.reference}</strong> as your transfer
                narration.
              </p>
              <p className="eyebrow upload-heading">02 / Upload your receipt</p>
              <label className={`upload-box ${busy ? 'disabled' : ''}`}>
                <FileUp size={25} />
                <strong>
                  {busy
                    ? 'Submitting your receipt…'
                    : 'Choose your payment receipt'}
                </strong>
                <span>JPG, PNG or PDF · Up to 3 MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <small>
                Uploading a receipt does not confirm payment. An administrator
                will verify your transfer.
              </small>
            </section>
          )}
          {order.payment_status === 'pending' && (
            <section className="panel pending-payment">
              <Check size={22} />
              <h3>Your receipt has been received.</h3>
              <p>
                Payment Verification Pending. We’ll update your order after
                reviewing the transfer.
              </p>
              {wa ? (
                <a
                  className="button whatsapp-button"
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BrandIcon brand="whatsapp" size={18} /> CONFIRM PAYMENT ON
                  WHATSAPP
                </a>
              ) : (
                <p className="muted">
                  WhatsApp contact is not configured yet. Your receipt is
                  already in the administrator’s queue.
                </p>
              )}
            </section>
          )}
          {order.payment_status === 'confirmed' && (
            <section className="panel">
              <CheckCircle2 size={26} />
              <h2>Your payment is confirmed.</h2>
              <p>Thank you. Follow your order’s progress here.</p>
              <div className="order-timeline">
                {[
                  'Payment Confirmed',
                  'Processing',
                  'Ready for Delivery',
                  'Delivered',
                ].map((s, i) => {
                  const pos = [
                    'Payment Confirmed',
                    'Processing',
                    'Ready for Delivery',
                    'Delivered',
                  ].indexOf(order.status);
                  return (
                    <div key={s} className={i <= pos ? 'completed' : ''}>
                      <span>{i <= pos ? <Check size={12} /> : i + 1}</span>
                      {s}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <section className="panel">
            <h3>Delivery details</h3>
            <p>
              {order.customer_name}
              <br />
              {order.address}
              <br />
              {order.phone}
              <br />
              {order.email}
            </p>
            {order.instructions && <p>Instructions: {order.instructions}</p>}
          </section>
          {order.payment_status === 'confirmed' &&
            order.status !== 'Cancelled' && (
              <section className="panel">
                <h2>Share your scent story.</h2>
                <p>
                  One review per purchased fragrance. Your review will appear
                  after moderation.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setReviewBusy(true);
                    try {
                      await api('review', {
                        reference: order.reference,
                        token,
                        productId: reviewProduct,
                        rating,
                        body,
                      });
                      toast(
                        'Thank you. Your verified review is awaiting approval.',
                      );
                      setBody('');
                      setReviewProduct('');
                    } catch (e) {
                      toast((e as Error).message);
                    } finally {
                      setReviewBusy(false);
                    }
                  }}
                >
                  <label>
                    Purchased fragrance
                    <select
                      required
                      value={reviewProduct}
                      onChange={(e) => setReviewProduct(e.target.value)}
                    >
                      <option value="">Choose a fragrance</option>
                      {order.order_items.map((i) => (
                        <option value={i.product_id} key={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rating-input" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        aria-pressed={rating === n}
                        key={n}
                        onClick={() => setRating(n)}
                      >
                        <Star
                          fill={n <= rating ? 'currentColor' : 'none'}
                          size={24}
                        />
                      </button>
                    ))}
                  </div>
                  <label>
                    Your review
                    <textarea
                      required
                      minLength={10}
                      maxLength={1500}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Tell us about your fragrance…"
                    />
                  </label>
                  <button className="button" disabled={reviewBusy}>
                    {reviewBusy ? 'Submitting…' : 'Submit verified review'}
                    <ArrowRight size={15} />
                  </button>
                </form>
              </section>
            )}
        </div>
        <aside className="order-summary">
          <h2>Your order</h2>
          {order.order_items.map((i) => (
            <div className="summary-item" key={i.id}>
              <span>
                {i.name}
                <small>
                  {i.quantity} × {money(i.unit_price)}
                </small>
              </span>
              <span>{money(i.unit_price * i.quantity)}</span>
            </div>
          ))}
          <div>
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div>
            <span>Delivery</span>
            <span>{money(order.delivery_fee)}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </div>
          <small>
            Order placed {new Date(order.created_at).toLocaleString('en-NG')}
          </small>
        </aside>
      </div>
    </div>
  );
}
export function Checkout() {
  const { lines, subtotal, invalid, settings, clearCart, loading, toast } =
    useCart();
  const [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      name: '',
      phone: '',
      email: '',
      address: '',
      instructions: '',
    }),
    [order, setOrder] = useState<Order | null>(null),
    [token] = useState(
      () => readLocal<string>('msc-checkout-key', '') || newToken(),
    );
  const bankReady = !!(
    settings.account_name &&
    settings.bank_name &&
    /^\d{10}$/.test(settings.account_number) &&
    settings.delivery_info
  );
  async function refresh() {
    if (order) {
      setOrder(
        await api<Order>('track', { reference: order.reference, token }),
      );
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    localStorage.setItem('msc-checkout-key', JSON.stringify(token));
    try {
      const result = await api<Order>('checkout', {
        ...form,
        items: lines.map((l) => ({
          productId: l.product_id,
          quantity: l.quantity,
        })),
        token,
      });
      setOrder(result);
      localStorage.setItem(
        'msc-last-order',
        JSON.stringify({ reference: result.reference, token }),
      );
      localStorage.removeItem('msc-checkout-key');
      clearCart();
      window.scrollTo(0, 0);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="loading">Preparing checkout…</div>;
  if (order)
    return (
      <main className="container checkout-page">
        <PageIntro eyebrow="Order created" title="Order placed." />
        <OrderView order={order} token={token} onRefresh={refresh} />
      </main>
    );
  return (
    <main className="container checkout-page">
      <PageIntro eyebrow="Secure bank transfer" title="Checkout." />
      {!lines.length ? (
        <Empty
          title="Your bag is empty."
          action={<ButtonLink to="/shop">Explore fragrances</ButtonLink>}
        >
          Add your favourites before checking out.
        </Empty>
      ) : !bankReady ? (
        <Empty
          title="The boutique is getting ready."
          action={<ButtonLink to="/contact">Contact us</ButtonLink>}
        >
          Ordering will open once bank transfer and delivery details are
          available. Your bag has been saved.
        </Empty>
      ) : invalid ? (
        <Empty
          title="Your bag needs a quick update."
          action={<ButtonLink to="/cart">Review your bag</ButtonLink>}
        >
          An item is unavailable or its stock has changed.
        </Empty>
      ) : (
        <form onSubmit={submit} className="checkout-layout">
          <section className="panel">
            <p className="eyebrow">01 / Your details</p>
            <h2>Delivery details</h2>
            <div className="form-grid">
              {(['name', 'phone', 'email'] as const).map((field) => (
                <label key={field}>
                  {field === 'name'
                    ? 'Full name'
                    : field === 'phone'
                      ? 'Phone number'
                      : 'Email address'}
                  <input
                    required
                    type={
                      field === 'email'
                        ? 'email'
                        : field === 'phone'
                          ? 'tel'
                          : 'text'
                    }
                    autoComplete={
                      field === 'name'
                        ? 'name'
                        : field === 'phone'
                          ? 'tel'
                          : 'email'
                    }
                    minLength={field === 'phone' ? 10 : 2}
                    maxLength={field === 'name' ? 100 : 254}
                    value={form[field]}
                    onChange={(e) =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Delivery address
              <textarea
                required
                autoComplete="street-address"
                minLength={10}
                maxLength={1000}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address, city, state and landmark"
              />
            </label>
            <label>
              Delivery instructions <span className="muted">(optional)</span>
              <textarea
                maxLength={1000}
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
              />
            </label>
            <div className="notice">
              <Truck size={18} />
              {settings.delivery_info}
            </div>
            <label className="checkbox">
              <input type="checkbox" required /> I agree to the{' '}
              <Link to="/terms" target="_blank">
                terms
              </Link>{' '}
              and have read the{' '}
              <Link to="/delivery" target="_blank">
                delivery & returns information
              </Link>
              .
            </label>
          </section>
          <aside className="order-summary">
            <h2>Order summary</h2>
            {lines.map((l) => (
              <div key={l.product_id} className="summary-item">
                <span>
                  {l.product?.name}
                  <small>Quantity: {l.quantity}</small>
                </span>
                <span>{money(price(l.product!) * l.quantity)}</span>
              </div>
            ))}
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{money(settings.delivery_fee)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(subtotal + settings.delivery_fee)}</strong>
            </div>
            <p>
              Pay by bank transfer. You’ll receive your unique order reference
              and bank details next.
            </p>
            <button className="button" disabled={busy}>
              {busy ? 'Creating your order…' : 'Place order'}
              <ArrowRight size={16} />
            </button>
            <small>
              <LockKeyhole size={13} /> Your details are kept private.
            </small>
          </aside>
        </form>
      )}
    </main>
  );
}
export function Track() {
  const saved = readLocal<SavedOrder | null>('msc-last-order', null);
  const [reference, setReference] = useState(saved?.reference || ''),
    [token, setToken] = useState(saved?.token || ''),
    [order, setOrder] = useState<Order | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const { toast } = useStore();
  const navigate = useNavigate();
  async function lookup() {
    setBusy(true);
    setError('');
    try {
      const o = await api<Order>('track', {
        reference: reference.trim().toUpperCase(),
        token: token.trim(),
      });
      setOrder(o);
      localStorage.setItem(
        'msc-last-order',
        JSON.stringify({ reference: o.reference, token: token.trim() }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference');
    if (ref) setReference(ref);
  }, []);
  return (
    <main className="container tracking-page">
      <PageIntro eyebrow="Order updates" title="Track your order." />
      {order ? (
        <>
          <button
            className="text-button"
            onClick={() => {
              setOrder(null);
              navigate('/track', { replace: true });
            }}
          >
            Track a different order
          </button>
          <OrderView
            order={order}
            token={token.trim()}
            onRefresh={async () => {
              try {
                setOrder(
                  await api<Order>('track', {
                    reference: order.reference,
                    token: token.trim(),
                  }),
                );
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          />
        </>
      ) : (
        <form
          className="panel tracking-form"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <LockKeyhole size={25} strokeWidth={1.3} />
          <h2>A private look at your order.</h2>
          <p>
            Enter the reference and private access code provided when you placed
            your order.
          </p>
          <label>
            Order reference
            <input
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="MSC-20261106-000001"
              autoComplete="off"
            />
          </label>
          <label>
            Private access code
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              type="password"
              minLength={64}
              maxLength={64}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Finding your order…' : 'Track my order'}
            <ArrowRight size={16} />
          </button>
          <p className="muted small">
            Can’t find your code? <Link to="/contact">Contact us</Link> with
            your order reference. We’ll verify your identity before sharing
            order information.
          </p>
        </form>
      )}
    </main>
  );
}
