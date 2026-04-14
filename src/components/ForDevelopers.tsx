const resources = [
  {
    title: 'SDK',
    label: 'npm package',
    description: 'Install the SDK and start building with stealth addresses.',
    code: 'npm install @wraith-protocol/sdk',
    link: 'https://docs.usewraith.xyz/sdk/overview',
    linkText: 'Read the docs',
  },
  {
    title: 'Demo App',
    description: 'See stealth payments in action on Horizen and Stellar.',
    link: 'https://demo.usewraith.xyz',
    linkText: 'Try the demo',
  },
  {
    title: 'Console',
    description: 'Manage your API keys, agents, and usage.',
    link: 'https://console.usewraith.xyz',
    linkText: 'Open console',
  },
];

export default function ForDevelopers() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-3xl font-bold text-on-surface md:text-4xl">
          For developers
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {resources.map((resource) => (
            <div
              key={resource.title}
              className="flex flex-col border border-outline-variant bg-surface-container p-8"
            >
              <div className="flex items-baseline gap-3">
                <h3 className="font-heading text-lg font-semibold text-on-surface">
                  {resource.title}
                </h3>
                {'label' in resource && resource.label && (
                  <span className="font-mono text-xs text-outline">{resource.label}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                {resource.description}
              </p>
              {'code' in resource && resource.code && (
                <pre className="mt-4 border border-outline-variant bg-surface-bright p-3 font-mono text-sm text-primary">
                  {resource.code}
                </pre>
              )}
              <a
                href={resource.link}
                className="mt-auto pt-6 text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                {resource.linkText} →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
