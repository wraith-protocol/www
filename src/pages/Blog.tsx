import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAllPosts,
  getPostBySlug,
  getAuthorById,
  getPostsByAuthor,
  getPostsByTag,
  getRelatedPosts,
  getTagFromSlug,
  slugifyTag,
  type BlogPost,
  type AuthorLinks,
} from '../utils/blog';
import BlogToc from '../components/BlogToc';
import { article, breadcrumbList, serializeJsonLd, SITE_URL } from '../utils/jsonld';
import { track } from '../utils/track';
import { usePageSeo } from '../utils/seo';
import { useLocalizedPath } from '../hooks/useLocalePath';
import { localizedDynamicUrl, hreflangAlternatesDynamic } from '../utils/seo';

function AuthorByline({ post, lp }: { post: BlogPost; lp: (path: string) => string }) {
  if (!post.author) return null;

  return (
    <>
      <span>•</span>
      {post.authorId ? (
        <Link
          to={lp(`/blog/author/${post.authorId}`)}
          className="transition-colors hover:text-on-surface"
        >
          {post.authorName}
        </Link>
      ) : (
        <span>{post.authorName}</span>
      )}
    </>
  );
}

/** Normalizes an i18n language tag to a supported analytics locale. */
function normalizeLocale(lang: string | undefined): string {
  if (lang === 'es') return 'es';
  return 'en';
}

function BlogList() {
  const posts = getAllPosts();
  const seo = usePageSeo('blog');
  const lp = useLocalizedPath();

  const listCrumbs = breadcrumbList([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(listCrumbs) }}
      />
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        {seo.alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title="Wraith Protocol Blog"
        />
      </Helmet>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">Blog</p>
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
          Wraith Protocol Blog
        </h1>
        <p className="max-w-2xl text-[17px] leading-7 text-on-surface-variant">
          Building private payments for the modern web. Subscribe to the RSS feed for new posts.
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="flex flex-col gap-2 border border-outline-variant-30 p-6 transition-colors hover:border-outline-variant"
          >
            <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
              <time dateTime={post.date}>{post.date}</time>
              <AuthorByline post={post} lp={lp} />
              <span>•</span>
              <span>{post.readingTimeMin} min read</span>
            </div>
            <h2 className="font-heading text-[22px] font-semibold text-on-surface hover:text-primary">
              <Link to={lp(`/blog/${post.slug}`)}>{post.title}</Link>
            </h2>
            {post.excerpt && (
              <p className="font-body text-[15px] leading-relaxed text-on-surface-variant">
                {post.excerpt}
              </p>
            )}
            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function BlogPostDetail({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  // One-shot guard: ensures a single `blog_post_read` per article page view,
  // independent of re-renders or continued scrolling.
  const readFiredRef = useRef(false);
  const lp = useLocalizedPath();
  const { i18n: i18nInstance } = useTranslation();
  const locale = (i18nInstance.language?.split('-')[0] ?? 'en') as 'en' | 'es' | 'pt';

  useEffect(() => {
    if (!post) return;

    // Reset for a new article view.
    readFiredRef.current = false;

    const fire = () => {
      if (readFiredRef.current) return;
      readFiredRef.current = true;
      track('blog_post_read', {
        slug: post.slug,
        locale: normalizeLocale(i18nInstance.language),
      });
      window.removeEventListener('scroll', onScroll);
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;

      // Short pages: content already fits the viewport, so the 80% threshold
      // is considered satisfied immediately.
      if (scrollHeight <= 0) {
        fire();
        return;
      }

      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const percent = (scrollTop / scrollHeight) * 100;
      if (percent >= 80) {
        fire();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Evaluate immediately (handles short pages and already-scrolled restores).
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [post, slug, i18nInstance.language]);

  if (!post) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12 md:px-12">
        <Helmet>
          <title>Post Not Found – Wraith Protocol</title>
        </Helmet>
        <h1 className="font-heading text-[28px] font-bold text-on-surface">Post Not Found</h1>
        <p className="text-on-surface-variant">The requested blog post could not be found.</p>
        <Link to={lp('/blog')} className="font-mono text-[13px] text-primary hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const { Component } = post;

  const dynamicPath = `/${post.slug}`;
  const postUrl = localizedDynamicUrl('blog', locale, dynamicPath);
  const postArticle = article({
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    authorName: post.author,
    url: postUrl,
  });
  const postCrumbs = breadcrumbList([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: localizedDynamicUrl('blog', locale, '') },
    { name: post.title, url: postUrl },
  ]);
  const alternates = hreflangAlternatesDynamic('blog', dynamicPath);

  return (
    <article className="mx-auto max-w-5xl px-6 py-12 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(postArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(postCrumbs) }}
      />
      <Helmet>
        <title>{post.title} – Wraith Protocol</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
        <link rel="canonical" href={postUrl} />
        {alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
        {post.tags.map((tag) => (
          <link
            key={tag}
            rel="alternate"
            type="application/rss+xml"
            href={`/feed/tag/${slugifyTag(tag)}.xml`}
            title={`Wraith Protocol Blog — ${tag}`}
          />
        ))}
      </Helmet>

      <div className="mb-8 flex flex-col gap-3">
        <Link
          to={lp('/blog')}
          className="mb-2 font-mono text-[12px] text-outline transition-colors hover:text-on-surface"
        >
          ← Back to Blog
        </Link>
        <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
          <time dateTime={post.date}>{post.date}</time>
          <AuthorByline post={post} lp={lp} />
          <span>•</span>
          <span>{post.readingTimeMin} min read</span>
        </div>
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
          {post.title}
        </h1>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-12">
        <BlogToc toc={post.toc} wordCount={post.wordCount} />

        <div className="prose prose-invert min-w-0 max-w-none flex-1 text-on-surface-variant">
          <Component />
        </div>
      </div>

      <RelatedPosts slug={slug} />
    </article>
  );
}

function AuthorInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex h-16 w-16 items-center justify-center bg-surface-container font-heading text-[18px] font-semibold text-primary">
      {initials}
    </div>
  );
}

function BlogAuthor({ id }: { id: string }) {
  const author = getAuthorById(id);
  const lp = useLocalizedPath();
  const { i18n: i18nInstance } = useTranslation();
  const locale = (i18nInstance.language?.split('-')[0] ?? 'en') as 'en' | 'es' | 'pt';

  if (!author) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12 md:px-12">
        <Helmet>
          <title>Author Not Found – Wraith Protocol</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="font-heading text-[28px] font-bold text-on-surface">Author Not Found</h1>
        <p className="text-on-surface-variant">
          We couldn&apos;t find a public author page for "{id}".
        </p>
        <Link to={lp('/blog')} className="font-mono text-[13px] text-primary hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const posts = getPostsByAuthor(id);
  const links = author.links ?? {};
  const linkEntries = Object.entries(links).filter(([, value]) => Boolean(value)) as [
    keyof AuthorLinks,
    string,
  ][];

  const dynamicPath = `/author/${id}`;
  const authorUrl = localizedDynamicUrl('blog', locale, dynamicPath);
  const alternates = hreflangAlternatesDynamic('blog', dynamicPath);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbList([
              { name: 'Home', url: SITE_URL },
              { name: 'Blog', url: localizedDynamicUrl('blog', locale, '') },
              { name: author.name, url: authorUrl },
            ]),
          ),
        }}
      />
      <Helmet>
        <title>{author.name} – Wraith Protocol Blog</title>
        <meta
          name="description"
          content={`Posts by ${author.name} on Wraith Protocol's privacy-preserving payments blog.`}
        />
        <link rel="canonical" href={authorUrl} />
        {alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
      </Helmet>

      <div className="flex flex-col gap-6 border border-outline-variant-30 p-6">
        <div className="flex items-start gap-5">
          {author.avatar ? (
            <img
              src={author.avatar}
              alt={`${author.name}'s avatar`}
              className="h-16 w-16 bg-surface-container object-cover"
            />
          ) : (
            <AuthorInitials name={author.name} />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-[26px] font-semibold text-on-surface sm:text-[30px]">
                {author.name}
              </h1>
            </div>
            <p className="text-[15px] leading-relaxed text-on-surface-variant">{author.bio}</p>
            {linkEntries.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-3">
                {linkEntries.map(([key, value]) => (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[12px] text-primary transition-colors hover:text-on-surface"
                  >
                    {key}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">
          {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
        </p>
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col gap-2 border border-outline-variant-30 p-6 transition-colors hover:border-outline-variant"
            >
              <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
                <time dateTime={post.date}>{post.date}</time>
              </div>
              <h2 className="font-heading text-[22px] font-semibold text-on-surface hover:text-primary">
                <Link to={lp(`/blog/${post.slug}`)}>{post.title}</Link>
              </h2>
              {post.excerpt && (
                <p className="font-body text-[15px] leading-relaxed text-on-surface-variant">
                  {post.excerpt}
                </p>
              )}
              {post.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
          {posts.length === 0 && (
            <p className="text-on-surface-variant">No posts by this author yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedPosts({ slug }: { slug: string }) {
  const related = getRelatedPosts(slug, 3);
  const lp = useLocalizedPath();

  if (related.length === 0) return null;

  return (
    <section className="mt-12 flex flex-col gap-4 border-t border-outline-variant-30 pt-8">
      <h2 className="font-heading text-[20px] font-semibold text-on-surface">Related posts</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {related.map((post) => (
          <Link
            key={post.slug}
            to={lp(`/blog/${post.slug}`)}
            className="flex flex-col gap-2 border border-outline-variant-30 p-4 transition-colors hover:border-outline-variant"
          >
            <div className="font-mono text-[12px] text-outline">
              <time dateTime={post.date}>{post.date}</time>
            </div>
            <span className="font-heading text-[16px] font-semibold leading-snug text-on-surface hover:text-primary">
              {post.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TagArchive({ tagSlug }: { tagSlug: string }) {
  const tag = getTagFromSlug(tagSlug);
  const lp = useLocalizedPath();
  const { i18n: i18nInstance } = useTranslation();
  const locale = (i18nInstance.language?.split('-')[0] ?? 'en') as 'en' | 'es' | 'pt';

  if (!tag) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12 md:px-12">
        <Helmet>
          <title>Tag Not Found – Wraith Protocol</title>
        </Helmet>
        <h1 className="font-heading text-[28px] font-bold text-on-surface">Tag Not Found</h1>
        <p className="text-on-surface-variant">No posts were found for this tag.</p>
        <Link to={lp('/blog')} className="font-mono text-[13px] text-primary hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const posts = getPostsByTag(tag);

  const dynamicPath = `/tag/${tagSlug}`;
  const tagUrl = localizedDynamicUrl('blog', locale, dynamicPath);
  const alternates = hreflangAlternatesDynamic('blog', dynamicPath);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 md:px-12">
      <Helmet>
        <title>#{tag} – Wraith Protocol Blog</title>
        <meta
          name="description"
          content={`Blog posts tagged ${tag} from Wraith Protocol on private payments and stealth infrastructure.`}
        />
        <link rel="canonical" href={tagUrl} />
        {alternates.map((alt) => (
          <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
        ))}
        <link
          rel="alternate"
          type="application/rss+xml"
          href={`/feed/tag/${slugifyTag(tag)}.xml`}
          title={`Wraith Protocol Blog — ${tag}`}
        />
      </Helmet>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">Tag</p>
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
          #{tag}
        </h1>
        <p className="max-w-2xl text-[17px] leading-7 text-on-surface-variant">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged "{tag}".{' '}
          <Link
            to={`/feed/tag/${slugifyTag(tag)}.xml`}
            className="font-mono text-[13px] text-primary hover:underline"
          >
            Subscribe via RSS
          </Link>
          .
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="flex flex-col gap-2 border border-outline-variant-30 p-6 transition-colors hover:border-outline-variant"
          >
            <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
              <time dateTime={post.date}>{post.date}</time>
              {post.author && (
                <>
                  <span>•</span>
                  <span>{post.author}</span>
                </>
              )}
            </div>
            <h2 className="font-heading text-[22px] font-semibold text-on-surface hover:text-primary">
              <Link to={lp(`/blog/${post.slug}`)}>{post.title}</Link>
            </h2>
            {post.excerpt && (
              <p className="font-body text-[15px] leading-relaxed text-on-surface-variant">
                {post.excerpt}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Blog() {
  const { slug, authorId, tagSlug } = useParams<{
    slug?: string;
    authorId?: string;
    tagSlug?: string;
  }>();

  if (tagSlug) {
    return <TagArchive tagSlug={tagSlug} />;
  }

  if (authorId) {
    return <BlogAuthor id={authorId} />;
  }

  if (slug) {
    return <BlogPostDetail slug={slug} />;
  }

  return <BlogList />;
}
