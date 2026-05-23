import { SITE_URL, resolveOgRoute } from './ogRoutes';

function setMeta(selector: string, content: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector);
  if (element) {
    element.content = content;
  }
}

export function applyRouteMetadata(pathname = window.location.pathname) {
  const route = resolveOgRoute(pathname);
  const title = route.route === '/' ? route.title : `${route.title} | Wraith Protocol`;
  const url = new URL(route.route, SITE_URL).toString();
  const image = new URL(route.image, SITE_URL).toString();

  document.title = `${title} - ${route.subtitle}`;

  setMeta('meta[name="description"]', route.description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', route.description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[property="og:image"]', image);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', route.description);
  setMeta('meta[name="twitter:image"]', image);
}
