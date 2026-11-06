export function meta(
  title: string,
  description: string,
  image = '/images/hero.jpg',
  type = 'website',
) {
  document.title = title;
  for (const [key, content] of Object.entries({
    description: description,
    'og:title': title,
    'og:description': description,
    'og:image': new URL(image, location.origin).href,
    'og:url': location.origin + location.pathname,
    'og:type': type,
  })) {
    const attribute = key.startsWith('og:') ? 'property' : 'name';
    let element = document.head.querySelector<HTMLMetaElement>(
      `meta[${attribute}="${key}"]`,
    );
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.content = content;
  }
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = location.origin + location.pathname;
}
