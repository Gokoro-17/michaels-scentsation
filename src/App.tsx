import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { api, whatsappUrl } from './lib';
import { meta } from './meta';
import { BrandLogo } from './BrandLogo';
import { BrandIcon } from './BrandIcon';
import { useStore } from './store';
import { useAutoHideHeader } from './useAutoHideHeader';
import {
  ButtonLink,
  Empty,
  Loading,
  PageIntro,
  ProductGrid,
  Stars,
} from './components';
import { Shop, ProductPage, Wishlist } from './catalogue';
import { Cart, Checkout, Track } from './commerce';
const Admin = lazy(() => import('./admin'));
const categoryContent = [
  {
    slug: 'deodorants',
    name: 'Deodorants',
    image: 'deodorants.jpg',
  },
  {
    slug: 'oil-perfumes',
    name: 'Oil Perfumes',
    image: 'oils.jpg',
  },
  {
    slug: 'luxury-perfumes',
    name: 'Luxury Perfumes',
    image: 'luxury.jpg',
  },
  {
    slug: 'combos',
    name: 'Perfume Combos',
    image: 'combos.jpg',
  },
];
function Brand() {
  const { settings } = useStore();
  return (
    <Link to="/" className="brand" aria-label={`${settings.brand_name} home`}>
      <BrandLogo decorative />
    </Link>
  );
}
function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const collectionMenu = useRef<HTMLDetailsElement>(null);
  const mobileNavigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const { cart, wishlist } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const headerHidden = useAutoHideHeader(
    header,
    open || search,
    location.pathname + location.search,
  );
  const count = cart.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    setOpen(false);
    setSearch(false);
    if (collectionMenu.current) collectionMenu.current.open = false;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const closeCollections = (event: PointerEvent) => {
      if (
        !collectionMenu.current?.contains(event.target as Node) &&
        collectionMenu.current
      )
        collectionMenu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (collectionMenu.current?.open) {
        collectionMenu.current.open = false;
        collectionMenu.current.querySelector('summary')?.focus();
      }
      if (
        document
          .getElementById('fragrance-search')
          ?.contains(document.activeElement)
      )
        searchButton.current?.focus();
      setSearch(false);
    };
    document.addEventListener('pointerdown', closeCollections);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeCollections);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const viewport = window.matchMedia('(max-width: 900px)');
    const resized = () => {
      if (!viewport.matches) setOpen(false);
    };
    viewport.addEventListener('change', resized);
    document.body.style.overflow = 'hidden';
    mobileNavigation.current?.querySelector<HTMLElement>('a')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const controls = [
          menuButton.current,
          ...Array.from(
            mobileNavigation.current?.querySelectorAll<HTMLElement>(
              'a, summary',
            ) || [],
          ),
        ].filter(
          (node): node is HTMLElement =>
            !!node && node.getClientRects().length > 0,
        );
        const index = controls.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        controls[
          (index + (event.shiftKey ? -1 : 1) + controls.length) %
            controls.length
        ]?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      viewport.removeEventListener('change', resized);
    };
  }, [open]);

  return (
    <>
      <header
        ref={header}
        className={`site-header${headerHidden ? ' site-header--hidden' : ''}`}
      >
        <div className="header-main container">
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            onClick={() => {
              setSearch(false);
              setOpen(!open);
            }}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <details
              className={`collection-menu ${location.pathname === '/shop' ? 'current' : ''}`}
              ref={collectionMenu}
            >
              <summary>
                Shop <ChevronDown size={13} />
              </summary>
              <nav
                className="collection-dropdown"
                aria-label="Shop collections"
              >
                <Link to="/shop">
                  All fragrances <ArrowRight size={14} />
                </Link>
                {categoryContent.map((category) => (
                  <Link
                    key={category.slug}
                    to={`/shop?category=${category.slug}`}
                  >
                    {category.name}
                  </Link>
                ))}
                <Link to="/shop?sort=popular">Best sellers</Link>
              </nav>
            </details>
            <NavLink to="/about">About Us</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>
          <div className="header-actions">
            <button
              ref={searchButton}
              className="icon-button"
              aria-label="Search fragrances"
              aria-expanded={search}
              aria-controls="fragrance-search"
              onClick={() => {
                setOpen(false);
                setSearch(!search);
              }}
            >
              <Search size={19} />
            </button>
            <Link
              to="/wishlist"
              className="icon-button wishlist-icon"
              aria-label={`Wishlist, ${wishlist.length} saved`}
            >
              <Heart size={19} />
              {wishlist.length > 0 && <b>{wishlist.length}</b>}
            </Link>
            <Link
              className="bag-link"
              to="/cart"
              aria-label={`Shopping bag, ${count} items`}
            >
              <ShoppingBag size={19} />
              <span className="bag-label">Bag</span>
              <b>{count}</b>
            </Link>
          </div>
        </div>
        {search && (
          <form
            id="fragrance-search"
            className="header-search container"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
              setSearch(false);
            }}
          >
            <Search size={18} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search by name or category"
              placeholder="Search fragrances…"
            />
            <button className="text-button" type="submit">
              Search <ArrowRight size={16} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                setSearch(false);
                searchButton.current?.focus();
              }}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        )}
      </header>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
          ref={mobileNavigation}
        >
          <Link to="/">
            Home <ArrowRight size={18} />
          </Link>
          <details className="mobile-collections">
            <summary>
              Shop <ChevronDown size={18} />
            </summary>
            <div>
              <Link to="/shop">All fragrances</Link>
              {categoryContent.map((category) => (
                <Link
                  key={category.slug}
                  to={`/shop?category=${category.slug}`}
                >
                  {category.name}
                </Link>
              ))}
              <Link to="/shop?sort=popular">Best sellers</Link>
            </div>
          </details>
          <Link to="/about">
            About Us <ArrowRight size={18} />
          </Link>
          <Link to="/contact">
            Contact <ArrowRight size={18} />
          </Link>
          <div className="mobile-care">
            <Link to="/track">Track your order</Link>
            <Link to="/wishlist">
              Your wishlist <Heart size={15} />
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}

function Newsletter() {
  const [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const { toast } = useStore();
  return (
    <section className="newsletter container">
      <div>
        <p className="eyebrow">The fragrance letter</p>
        <h2>
          Stay in the <em>know.</em>
        </h2>
        <p>New fragrances, collection updates and special offers.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('subscribe', { email });
            setDone(true);
          } catch (e) {
            toast((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {done ? (
          <p className="success">
            <Check size={18} /> You’re on the list. Welcome to the collection.
          </p>
        ) : (
          <>
            <div className="newsletter-field">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email for newsletter"
                placeholder="Your email address"
              />
              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                disabled={busy}
              >
                {busy ? '…' : <ArrowRight size={22} />}
              </button>
            </div>
            <small>
              By subscribing, you agree to receive our fragrance updates.
            </small>
          </>
        )}
      </form>
    </section>
  );
}
function Footer() {
  const { settings } = useStore();
  const wa = whatsappUrl(
    settings.whatsapp,
    "Hello MICHAEL'S SCENTSATION, I’d like some help choosing a fragrance.",
  );
  return (
    <footer className="site-footer">
      <div className="footer-main container">
        <div className="footer-brand">
          <Brand />
          <p>{settings.slogan}</p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/shop">All fragrances</Link>
          <Link to="/shop?sort=popular">Best sellers</Link>
          <Link to="/shop?sort=newest">New arrivals</Link>
          <Link to="/wishlist">Your wishlist</Link>
        </div>
        <div>
          <h3>The collection</h3>
          {categoryContent.map((c) => (
            <Link key={c.slug} to={`/shop?category=${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </div>
        <div>
          <h3>Customer care</h3>
          <Link to="/contact">Contact us</Link>
          <Link to="/track">Track your order</Link>
          <Link to="/delivery">Delivery & returns</Link>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp <BrandIcon brand="whatsapp" size={16} />
            </a>
          )}
          {settings.instagram && (
            <a href={settings.instagram} target="_blank" rel="noreferrer">
              Instagram <BrandIcon brand="instagram" size={16} />
            </a>
          )}
        </div>
      </div>
      <div className="footer-bottom container">
        <span>
          © {new Date().getFullYear()} {settings.brand_name}. All rights
          reserved.
        </span>
        <div>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of service</Link>
        </div>
      </div>
    </footer>
  );
}
function Home() {
  const { products, reviews, settings, loading, error, refresh } = useStore();
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const best = products.filter((product) => product.bestseller).slice(0, 4);
  const slogan = settings.slogan.split(' ');
  const finalWord = slogan.pop();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-copy-inner">
            <p className="eyebrow">{settings.brand_name}</p>
            <h1>
              {slogan.join(' ')} <em>{finalWord}</em>
            </h1>
            <p className="hero-description">
              Discover fragrances that define your presence. From everyday
              essentials to luxurious scents, find the perfect fragrance for
              every occasion.
            </p>
            <div className="hero-ctas">
              <ButtonLink to="/shop">Explore Collection</ButtonLink>
              <ButtonLink to="/shop?sort=popular" secondary>
                Shop Best Sellers
              </ButtonLink>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/hero.jpg"
            alt="Amber fragrance in sculpted glass on warm travertine, lit by afternoon sunlight"
            fetchPriority="high"
          />
        </div>
      </section>
      <section className="section container" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The collection</p>
            <h2>
              Find your <em>signature.</em>
            </h2>
          </div>
        </div>
        <div className="category-grid">
          {categoryContent.map((category) => (
            <Link
              className="category-card"
              to={`/shop?category=${category.slug}`}
              key={category.slug}
            >
              <div className="category-image">
                <img
                  src={`/images/${category.image}`}
                  alt={`${category.name} fragrance collection`}
                  loading="lazy"
                />
              </div>
              <div className="category-caption">
                <h3>{category.name}</h3>
                <ArrowRight size={18} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      {(loading || error || products.length > 0) && (
        <section className="section featured-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">The Michael’s edit</p>
                <h2>
                  Featured <em>fragrances.</em>
                </h2>
              </div>
              <Link className="text-link" to="/shop">
                Shop all <ArrowRight size={16} />
              </Link>
            </div>
            {loading ? (
              <Loading />
            ) : error ? (
              <Empty
                title="We couldn’t load the collection"
                action={
                  <button
                    className="button secondary"
                    onClick={() => void refresh()}
                  >
                    Try again
                  </button>
                }
              >
                {error}
              </Empty>
            ) : (
              <ProductGrid
                products={featured.length ? featured : products.slice(0, 4)}
              />
            )}
          </div>
        </section>
      )}
      {best.length > 0 && (
        <section className="section container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The most loved</p>
              <h2>
                Best <em>sellers.</em>
              </h2>
            </div>
            <Link className="text-link" to="/shop?sort=popular">
              Explore best sellers <ArrowRight size={16} />
            </Link>
          </div>
          <ProductGrid products={best} />
        </section>
      )}
      <section className="combo-banner">
        <div className="container">
          <div>
            <p className="eyebrow">Perfume combos</p>
            <h2>{settings.promo_title}</h2>
            <p>{settings.promo_text}</p>
            <ButtonLink to="/shop?category=combos">Explore combos</ButtonLink>
          </div>
          <div className="combo-visual">
            <img
              src="/images/combos.jpg"
              alt="Perfume and deodorant paired beside a gift box"
              loading="lazy"
            />
          </div>
        </div>
      </section>
      {reviews.length > 0 && (
        <section className="section container testimonials">
          <p className="eyebrow">Verified purchases</p>
          <h2>
            From our <em>customers.</em>
          </h2>
          <div className="review-grid">
            {reviews.slice(0, 3).map((review) => (
              <blockquote key={review.id}>
                <Stars value={review.rating} />
                <p>“{review.body}”</p>
                <footer>
                  {review.customer_name}
                  <span>
                    <Check size={12} /> Verified purchase
                  </span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}
      <Newsletter />
    </>
  );
}

function Info({ kind }: { kind: string }) {
  const { settings } = useStore();
  const wa = whatsappUrl(
    settings.whatsapp,
    "Hello MICHAEL'S SCENTSATION, I’d like to ask about your fragrances.",
  );
  if (kind === 'about')
    return (
      <>
        <PageIntro
          eyebrow="Our story"
          title="A personal art. A lasting impression."
        >
          Welcome to Michael’s Scentsation.
        </PageIntro>
        <section className="story-banner container info-story">
          <div className="story-image">
            <img
              src="/images/story.jpg"
              alt="Fragrance in warm afternoon light"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">...Experience the Art of Fragrance</p>
            <h2>
              Find a fragrance
              <br />
              <em>that feels like you.</em>
            </h2>
            <p>
              MICHAEL’S SCENTSATION brings together deodorants, oil perfumes,
              luxury perfumes and fragrance combos for the everyday and the
              unforgettable.
            </p>
            <p>
              Explore at your own pace. If you need a hand choosing, get in
              touch — we’re here to help you find a scent for your style and
              occasion.
            </p>
            <ButtonLink to="/shop">Explore the collection</ButtonLink>
          </div>
        </section>
      </>
    );
  if (kind === 'contact')
    return (
      <main className="container narrow">
        <PageIntro
          eyebrow="Let’s talk fragrance"
          title="A little help finding the one."
        >
          Questions about a scent, an order, or the perfect pairing? We’d love
          to help.
        </PageIntro>
        <div className="contact-grid">
          <div className="panel">
            <BrandIcon brand="whatsapp" size={24} />
            <h3>A personal conversation</h3>
            <p>Get help choosing a fragrance or ask about an existing order.</p>
            {wa ? (
              <a className="button" href={wa} target="_blank" rel="noreferrer">
                Chat on WhatsApp <ArrowRight size={16} />
              </a>
            ) : (
              <p className="muted">
                Our WhatsApp contact will be available when the store opens.
              </p>
            )}
          </div>
          <div className="panel">
            <h3>Stay connected</h3>
            {settings.contact_email && (
              <a
                className="text-link"
                href={`mailto:${settings.contact_email}`}
              >
                {settings.contact_email}
              </a>
            )}
            {settings.instagram && (
              <a
                className="text-link"
                href={settings.instagram}
                target="_blank"
                rel="noreferrer"
              >
                <BrandIcon brand="instagram" size={18} /> Find us on Instagram
              </a>
            )}
            {settings.address && <p>{settings.address}</p>}
            <Link className="text-link" to="/track">
              Track an existing order <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <main className="container prose narrow">
      <PageIntro
        eyebrow="Customer care"
        title={
          kind === 'delivery'
            ? 'Delivery & returns'
            : kind === 'privacy'
              ? 'Your privacy matters.'
              : 'Terms of service'
        }
      />
      {kind === 'delivery' ? (
        <>
          <h2>Delivery information</h2>
          <p>
            {settings.delivery_info ||
              'Delivery areas, timelines and return terms will be published before the store opens for orders. Please contact us before placing an order if you have any questions.'}
          </p>
          <h2>Your order</h2>
          <p>
            After payment confirmation, your order moves to processing. You can
            follow its progress using your order reference and private access
            code on the tracking page.
          </p>
          <Link className="text-link" to="/contact">
            Contact customer care <ArrowRight size={16} />
          </Link>
        </>
      ) : kind === 'privacy' ? (
        <>
          <h2>Information we collect</h2>
          <p>
            When you place an order, we collect your name, phone number, email
            address, delivery address and payment receipt to fulfil and verify
            your purchase. Receipts are stored privately and are accessible only
            through authorized server operations.
          </p>
          <h2>Your device</h2>
          <p>
            Your shopping bag, wishlist, recently viewed products and private
            order access code are saved in your browser. Administrator
            authentication uses browser storage to maintain a secure session. We
            do not use advertising trackers.
          </p>
          <h2>Service providers & your choices</h2>
          <p>
            Supabase stores order data and images. Vercel hosts the application.
            When enabled, Resend delivers order notifications to the business.
            WhatsApp opens only when you choose to contact us. Newsletter
            subscriptions are optional and each email includes an unsubscribe
            link.
          </p>
          <p>
            To request access, correction or deletion of your information, use
            our contact page. Business contact details and the operational
            retention schedule must be finalized before accepting customer
            orders.
          </p>
        </>
      ) : (
        <>
          <h2>Orders & payment</h2>
          <p>
            Prices are in Nigerian Naira. Your total includes the delivery fee
            shown at checkout. Bank transfer receipts are reviewed manually;
            uploading a receipt does not confirm payment. Stock is allocated on
            payment confirmation. If an item becomes unavailable before
            confirmation, contact us to arrange a replacement or refund before
            payment is confirmed.
          </p>
          <h2>Availability</h2>
          <p>
            Only published, available products may be ordered. Offers apply at
            the price confirmed when your order is created. Delivery and return
            terms are available on the delivery page.
          </p>
          <h2>Reviews</h2>
          <p>
            Only confirmed purchases can leave a verified review, once per
            purchased product. Reviews are moderated before publication.
          </p>
        </>
      )}
    </main>
  );
}
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    meta(
      `${pathname === '/shop' ? 'The Collection' : pathname === '/cart' ? 'Your Bag' : pathname.startsWith('/admin') ? 'Studio' : pathname === '/track' ? 'Track Your Order' : 'The Art of Fragrance'} | Michael’s Scentsation`,
      'Discover luxury perfumes, perfume oils, deodorants and fragrance combos at Michael’s Scentsation.',
    );
    let robots = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = /^\/(admin|checkout|track|cart|wishlist)/.test(pathname)
      ? 'noindex, nofollow'
      : 'index, follow';
  }, [pathname]);
  return null;
}
export default function App() {
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin');
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RouteEffects />
      {!admin && <Header />}
      <div id="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/track" element={<Track />} />
            <Route path="/admin/*" element={<Admin />} />
            {['about', 'contact', 'delivery', 'privacy', 'terms'].map(
              (kind) => (
                <Route
                  key={kind}
                  path={`/${kind}`}
                  element={<Info kind={kind} />}
                />
              ),
            )}
            <Route
              path="*"
              element={
                <div className="container">
                  <Empty
                    title="This page wandered off."
                    action={
                      <ButtonLink to="/">Back to the boutique</ButtonLink>
                    }
                  >
                    Let’s help you find something beautiful.
                  </Empty>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>
      {!admin && <Footer />}
    </>
  );
}
