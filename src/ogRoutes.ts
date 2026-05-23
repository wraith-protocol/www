export const SITE_URL = 'https://usewraith.xyz';

export const ogRoutes = {
  '/': {
    route: '/',
    slug: 'home',
    title: 'Wraith Protocol',
    subtitle: 'Private payments for every chain',
    description:
      'Stealth addresses, multichain SDK, and privacy agents for receiver-unlinkable payments.',
    badge: 'MULTICHAIN',
    image: '/og/home.png',
  },
  '/stellar': {
    route: '/stellar',
    slug: 'stellar',
    title: 'Wraith on Stellar',
    subtitle: 'Stealth payments with ed25519 and Soroban',
    description:
      'Stellar-native stealth accounts, Soroban announcements, and fee-bump-friendly withdrawals.',
    badge: 'STELLAR WAVE',
    image: '/og/stellar.png',
  },
} as const;

export type OgRouteKey = keyof typeof ogRoutes;
export type OgRouteConfig = (typeof ogRoutes)[OgRouteKey];

export const ogRouteList = Object.values(ogRoutes);

export function resolveOgRoute(pathname: string): OgRouteConfig {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return ogRoutes[normalized as OgRouteKey] ?? ogRoutes['/'];
}
