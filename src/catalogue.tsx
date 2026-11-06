import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import {
  ButtonLink,
  Empty,
  Loading,
  PageIntro,
  ProductGrid,
  Quantity,
  Stars,
} from './components';
import { money, price, supabase } from './lib';
import { meta } from './meta';
import { useStore } from './store';
export function Shop() {
  const { products, categories, reviews, loading, error, refresh } = useStore();
  const [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState(false);
  const category = params.get('category') || '',
    q = params.get('q') || '',
    sort = params.get('sort') || 'newest',
    available = params.get('available') === 'true',
    min = Number(params.get('min') || 0),
    max = Number(params.get('max') || 0);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const visible = useMemo(() => {
    const average = (id: string) => {
      const r = reviews.filter((r) => r.product_id === id);
      return r.reduce((n, r) => n + r.rating, 0) / (r.length || 1);
    };
    return products
      .filter(
        (p) =>
          (!category || p.category?.slug === category) &&
          (!q ||
            `${p.name} ${p.category?.name} ${p.notes.join(' ')}`
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!available || (p.available && p.stock > 0)) &&
          price(p) >= min &&
          (!max || price(p) <= max),
      )
      .sort((a, b) =>
        sort === 'price-low'
          ? price(a) - price(b)
          : sort === 'price-high'
            ? price(b) - price(a)
            : sort === 'rating'
              ? average(b.id) - average(a.id)
              : sort === 'popular'
                ? (b.sales_count || 0) - (a.sales_count || 0) ||
                  Number(b.bestseller) - Number(a.bestseller)
                : Date.parse(b.created_at) - Date.parse(a.created_at),
      );
  }, [products, category, q, sort, available, min, max, reviews]);
  return (
    <main className="container shop-page">
      <PageIntro
        eyebrow="The collection"
        title={
          categories.find((c) => c.slug === category)?.name ||
          'Find your signature scent.'
        }
      >
        A considered collection. A world of possibilities.
      </PageIntro>
      <div className="shop-toolbar">
        <div className="shop-search">
          <Search size={18} />
          <input
            aria-label="Search fragrances"
            placeholder="Search fragrances, notes, categories…"
            value={q}
            onChange={(e) => change('q', e.target.value)}
          />
        </div>
        <button
          className="filter-button"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={16} /> Filters{' '}
          {params.size > 1 && <Check size={13} aria-label="Filters applied" />}
        </button>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => change('sort', e.target.value)}
        >
          <option value="newest">New arrivals</option>
          <option value="popular">Best sellers first</option>
          <option value="rating">Highest rated</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
        </select>
      </div>
      <div
        className="category-tabs"
        role="group"
        aria-label="Product categories"
      >
        <button
          className={!category ? 'active' : ''}
          onClick={() => change('category', '')}
        >
          All fragrances
        </button>
        {categories.map((c) => (
          <button
            className={category === c.slug ? 'active' : ''}
            key={c.id}
            onClick={() => change('category', c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>
      {filters && (
        <div className="filter-panel">
          <label>
            Minimum price (₦)
            <input
              type="number"
              min="0"
              value={params.get('min') || ''}
              placeholder="0"
              onChange={(e) => change('min', e.target.value)}
            />
          </label>
          <label>
            Maximum price (₦)
            <input
              type="number"
              min="0"
              value={params.get('max') || ''}
              placeholder="No limit"
              onChange={(e) => change('max', e.target.value)}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) =>
                change('available', e.target.checked ? 'true' : '')
              }
            />{' '}
            In stock only
          </label>
          <button className="text-button" onClick={() => setParams({})}>
            Reset filters
          </button>
        </div>
      )}
      <div className="results-count">
        {visible.length} fragrance{visible.length === 1 ? '' : 's'}{' '}
        {q && `matching “${q}”`}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty
          title="We couldn’t load the collection"
          action={
            <button className="button" onClick={() => void refresh()}>
              Try again
            </button>
          }
        >
          {error}
        </Empty>
      ) : visible.length ? (
        <ProductGrid products={visible} />
      ) : (
        <Empty
          title={
            products.length
              ? 'No scents found.'
              : 'The collection is being curated.'
          }
          action={
            products.length ? (
              <button
                className="button secondary"
                onClick={() => setParams({})}
              >
                Clear filters
              </button>
            ) : (
              <ButtonLink to="/contact">Get in touch</ButtonLink>
            )
          }
        >
          {products.length
            ? 'Try another name, category or price range.'
            : 'New fragrances will appear here as soon as they’re ready.'}
        </Empty>
      )}
    </main>
  );
}
export function Wishlist() {
  const { products, wishlist, loading } = useStore();
  return (
    <main className="container shop-page">
      <PageIntro eyebrow="Saved fragrances" title="Your wishlist." />
      {loading ? (
        <Loading />
      ) : wishlist.some((id) => products.some((p) => p.id === id)) ? (
        <ProductGrid
          products={products.filter((p) => wishlist.includes(p.id))}
        />
      ) : (
        <Empty
          title="Your wishlist is waiting."
          action={<ButtonLink to="/shop">Explore the collection</ButtonLink>}
        >
          Tap the heart on any fragrance to save it here.
        </Empty>
      )}
    </main>
  );
}
export function ProductPage() {
  const { slug } = useParams();
  const {
    products,
    reviews,
    loading,
    error,
    viewed,
    add,
    wishlist,
    toggleWish,
    recent,
    toast,
  } = useStore();
  const [quantity, setQuantity] = useState(1),
    [selectedImage, setSelectedImage] = useState(''),
    [gallery, setGallery] = useState<{ url: string; alt: string }[]>([]);
  const p = products.find((p) => p.slug === slug),
    navigate = useNavigate();
  useEffect(() => {
    setQuantity(1);
    setSelectedImage('');
    if (p) {
      viewed(p.id);
      meta(
        `${p.name} | Michael’s Scentsation`,
        p.description.slice(0, 160),
        p.image_url || '/images/hero.jpg',
        'product',
      );
      supabase
        ?.from('product_images')
        .select('url,alt')
        .eq('product_id', p.id)
        .order('position')
        .then((r) => {
          if (r.error) toast('Additional images are temporarily unavailable.');
          setGallery(r.data || []);
        });
    }
    return () => {
      setGallery([]);
    };
  }, [p?.id]);
  if (loading) return <Loading />;
  if (!p)
    return (
      <div className="container">
        <Empty
          title={
            error ? 'The collection is unavailable' : 'Fragrance not found'
          }
          action={<ButtonLink to="/shop">Back to the collection</ButtonLink>}
        >
          {error || 'This fragrance may no longer be available.'}
        </Empty>
      </div>
    );
  const ratings = reviews.filter((r) => r.product_id === p.id),
    average = ratings.reduce((n, r) => n + r.rating, 0) / (ratings.length || 1);
  const related = products
    .filter((x) => x.id !== p.id)
    .sort(
      (a, b) =>
        Number(b.category_id === p.category_id) -
        Number(a.category_id === p.category_id),
    )
    .slice(0, 4);
  const available = p.available && p.stock > 0;
  return (
    <main className="container product-page">
      <Link className="back-link" to="/shop">
        <ArrowLeft size={14} /> Back to the collection
      </Link>
      <div className="product-detail">
        <div>
          <div className="detail-image">
            <img
              src={selectedImage || p.image_url || '/images/hero.jpg'}
              alt={p.name}
            />
          </div>
          {gallery.length > 0 && (
            <div
              className="gallery-thumbs"
              role="group"
              aria-label="Product images"
            >
              {[{ url: p.image_url, alt: p.name }, ...gallery].map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img.url)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={img.url} alt={img.alt} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {p.category?.name} {p.size && ` / ${p.size}`}
          </p>
          <h1>{p.name}</h1>
          <div className="detail-rating">
            <Stars value={average} />
            <a href="#reviews">
              {ratings.length
                ? `${average.toFixed(1)} · ${ratings.length} reviews`
                : 'Be the first to review'}
            </a>
          </div>
          <p className="detail-price">
            {money(price(p))} {p.discount_price && <del>{money(p.price)}</del>}
          </p>
          <p className="description">{p.description}</p>
          {p.notes.length > 0 && (
            <div className="note-chips">
              {p.notes.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          )}
          <p className={`stock-label ${available ? 'in-stock' : ''}`}>
            {available ? (
              <>
                <span /> In stock{' '}
                {p.stock <= p.low_stock_threshold && `— only ${p.stock} left`}
              </>
            ) : (
              <>Currently sold out</>
            )}
          </p>
          <div className="detail-actions">
            <Quantity value={quantity} max={p.stock} onChange={setQuantity} />
            <button
              className="button"
              disabled={!available}
              onClick={() => add(p, quantity)}
            >
              Add to bag <ArrowRight size={16} />
            </button>
            <button
              className={`icon-button large ${wishlist.includes(p.id) ? 'saved' : ''}`}
              aria-label="Toggle wishlist"
              aria-pressed={wishlist.includes(p.id)}
              onClick={() => toggleWish(p.id)}
            >
              <Heart
                size={20}
                fill={wishlist.includes(p.id) ? 'currentColor' : 'none'}
              />
            </button>
          </div>
          <button
            className="button secondary buy-now"
            disabled={!available}
            onClick={() => {
              add(p, quantity);
              navigate('/checkout');
            }}
          >
            Buy now <ArrowRight size={16} />
          </button>
          <div className="detail-assurances">
            <span>
              <ShieldCheck size={17} /> Bank transfer, manually verified
            </span>
            <span>
              <Truck size={17} /> Delivery details at checkout
            </span>
          </div>
          <details>
            <summary>Delivery & care</summary>
            <p>
              Keep your fragrance in a cool, dry place away from direct
              sunlight. See our{' '}
              <Link to="/delivery">delivery and returns information</Link>{' '}
              before ordering.
            </p>
          </details>
        </div>
      </div>
      <section className="section product-reviews" id="reviews">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The scent, in your words</p>
            <h2>
              Customer <em>reviews.</em>
            </h2>
          </div>
          <Link className="text-link" to="/track">
            Purchased this? Leave a review <ArrowRight size={16} />
          </Link>
        </div>
        {ratings.length ? (
          <div className="review-grid">
            {ratings.map((r) => (
              <article className="review-card" key={r.id}>
                <Stars value={r.rating} />
                <p>{r.body}</p>
                <strong>{r.customer_name}</strong>
                <small>
                  <Check size={12} /> Verified purchase ·{' '}
                  {new Date(r.created_at).toLocaleDateString('en-NG')}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            No reviews yet. Reviews from confirmed purchases will appear here.
          </p>
        )}
      </section>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Keep exploring</p>
              <h2>You May Also Like</h2>
            </div>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
      {recent.filter((id) => id !== p.id).length > 0 && (
        <section className="section">
          <p className="eyebrow">Another look</p>
          <h2>Recently viewed</h2>
          <ProductGrid
            products={products
              .filter((x) => recent.includes(x.id) && x.id !== p.id)
              .slice(0, 4)}
          />
        </section>
      )}
    </main>
  );
}
