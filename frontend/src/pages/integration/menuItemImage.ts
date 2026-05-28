import { MobileMenuItem } from './smartPosTypes';

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 360;
  }
  return h;
}

/** Placeholder local (SVG) quando o produto ainda não tem foto no cadastro. */
export function getMenuItemPlaceholderSrc(item: Pick<MobileMenuItem, 'id' | 'name'>): string {
  const initial = item.name.trim().charAt(0).toUpperCase() || '?';
  const hue = hashHue(item.id);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue},55%,72%)"/>
      <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360},45%,48%)"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <text x="200" y="230" text-anchor="middle" font-family="system-ui,sans-serif" font-size="140" font-weight="700" fill="rgba(255,255,255,0.92)">${initial}</text>
</svg>`.trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getMenuItemImageSrc(
  item: MobileMenuItem,
  apiBase: string,
): string {
  if (item.imageUrl) return item.imageUrl;
  if (item.imageKey) {
    const base = apiBase.replace(/\/$/, '');
    const version = encodeURIComponent(
      item.imageUpdatedAt ?? item.imageKey,
    );
    return `${base}/public/products/${item.id}/photo?v=${version}`;
  }
  return getMenuItemPlaceholderSrc(item);
}

/** Chave estável para forçar novo <img> quando a foto do produto mudar. */
export function getMenuItemImageCacheKey(item: MobileMenuItem): string {
  return `${item.id}:${item.imageKey ?? ''}:${item.imageUpdatedAt ?? ''}`;
}
