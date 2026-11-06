type BrandIconProps = {
  brand: 'whatsapp' | 'instagram';
  size?: number;
  className?: string;
};

// Font Awesome's standard brand artwork. Link/button text supplies its accessible name.
export function BrandIcon({
  brand,
  size = 18,
  className = '',
}: BrandIconProps) {
  return (
    <svg
      className={`brand-icon ${className}`}
      viewBox="0 0 448 512"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`/icons/brands.svg#${brand}`} />
    </svg>
  );
}
