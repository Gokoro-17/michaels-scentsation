import {
  ArrowRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { money, price } from './lib';
import { useStore } from './store';
import type { Product } from './types';
import type { ReactNode } from 'react';
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? 'secondary' : ''}`} to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
export function Stars({ value = 0 }: { value?: number }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          fill={n <= Math.round(value) ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}
export function Quantity({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="quantity">
      <button
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span>{value}</span>
      <button
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { add, wishlist, toggleWish, reviews } = useStore();
  const ratings = reviews.filter((r) => r.product_id === p.id);
  const average =
    ratings.reduce((n, r) => n + r.rating, 0) / (ratings.length || 1);
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${p.slug}`} aria-label={`View ${p.name}`}>
          <img
            src={p.image_url || '/images/hero.jpg'}
            alt={p.name}
            loading="lazy"
          />
        </Link>
        <div className="product-tags">
          {!p.available || p.stock < 1 ? (
            <span>Sold out</span>
          ) : p.discount_price ? (
            <span>Sale</span>
          ) : p.bestseller ? (
            <span>Best seller</span>
          ) : null}
        </div>
        <button
          className={`wish-button ${wishlist.includes(p.id) ? 'saved' : ''}`}
          aria-label={
            wishlist.includes(p.id)
              ? `Remove ${p.name} from wishlist`
              : `Save ${p.name} to wishlist`
          }
          aria-pressed={wishlist.includes(p.id)}
          onClick={() => toggleWish(p.id)}
        >
          <Heart
            size={18}
            fill={wishlist.includes(p.id) ? 'currentColor' : 'none'}
          />
        </button>
        <button
          className="quick-add"
          disabled={!p.available || p.stock < 1}
          onClick={() => add(p)}
        >
          <Plus size={15} /> Add to bag
        </button>
      </div>
      <div className="product-info">
        <p className="eyebrow">
          {p.category?.name || 'Fragrance'} {p.size && ` · ${p.size}`}
        </p>
        <Link to={`/product/${p.slug}`}>
          <h3>{p.name}</h3>
        </Link>
        <div className="product-price">
          <span>{money(price(p))}</span>
          {p.discount_price && <del>{money(p.price)}</del>}
        </div>
        <div className="product-rating">
          {ratings.length ? (
            <>
              <Stars value={average} />
              <span>({ratings.length})</span>
            </>
          ) : (
            <span className="muted">No reviews yet</span>
          )}
          <span className="availability">
            {p.available && p.stock > 0 ? 'In stock' : 'Sold out'}
          </span>
        </div>
        <Link className="details-link" to={`/product/${p.slug}`}>
          View details <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <ShoppingBag size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Finding your next favourite…
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
