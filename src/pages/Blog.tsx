import { Helmet } from 'react-helmet-async';

export default function Blog() {
  return (
    <main className="min-h-screen bg-surface px-6 py-24 text-on-surface md:px-12">
      <Helmet>
        <title>Blog – Wraith Protocol</title>
        <meta
          name="description"
          content="Updates from Wraith Protocol on privacy-preserving payments and stealth infrastructure."
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title="Wraith Protocol Blog"
        />
      </Helmet>

      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">Blog</p>
          <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
            Building private payments for the modern web
          </h1>
          <p className="max-w-2xl text-[17px] leading-7 text-on-surface-variant">
            This page lists the latest updates from Wraith Protocol. Subscribe to the RSS feed for
            new posts.
          </p>
        </div>

        <div className="space-y-4 border border-outline-variant-30 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">
            Latest posts
          </p>
          <ul className="space-y-3">
            {[
              {
                title: 'Privacy by default',
                href: '/blog/privacy-by-default',
              },
              {
                title: 'Stealth addresses explained',
                href: '/blog/stealth-addresses-explained',
              },
            ].map((post) => (
              <li
                key={post.href}
                className="border-b border-outline-variant-30 pb-3 last:border-b-0 last:pb-0"
              >
                <a href={post.href} className="text-[18px] text-primary hover:underline">
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
