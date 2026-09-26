export const SITE_URL = 'https://www.usewraith.xyz';

export type JsonLdObject = Record<string, unknown> & { '@context': string; '@type': string };

export interface OrganizationInput {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export function organization(input: OrganizationInput = {}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: input.name ?? 'Wraith Protocol',
    url: input.url ?? SITE_URL,
    logo: input.logo ?? `${SITE_URL}/logo.png`,
    sameAs: input.sameAs ?? [
      'https://github.com/wraith-protocol',
      'https://twitter.com/wraith_protocol',
    ],
  };
}

export interface ArticleInput {
  headline: string;
  description: string;
  datePublished: string;
  authorName: string;
  url: string;
  publisherName?: string;
}

export function article(input: ArticleInput): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    author: {
      '@type': 'Organization',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: input.publisherName ?? 'Wraith Protocol',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPage(entries: FaqItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export interface HowToInput {
  name: string;
  description?: string;
  steps: HowToStep[];
  url?: string;
  totalTime?: string;
}

export function howTo(input: HowToInput): JsonLdObject {
  const step = input.steps.map((s, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: s.name,
    text: s.text,
    ...(s.url ? { url: s.url } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    step,
    ...(input.url ? { mainEntityOfPage: { '@type': 'WebPage', '@id': input.url } } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbList(items: BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
