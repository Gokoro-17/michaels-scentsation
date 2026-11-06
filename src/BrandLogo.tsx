type BrandLogoProps = {
  className?: string;
  decorative?: boolean;
};

// Frame the latest supplied artwork without redrawing or changing its pixels.
export function BrandLogo({
  className = '',
  decorative = false,
}: BrandLogoProps) {
  return (
    <svg
      className={`brand-art ${className}`}
      viewBox="90 153 318 202"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : "MICHAEL'S SCENTSATION"}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <image href="/images/brand-logo.png" width="500" height="500" />
    </svg>
  );
}
