const features = [
  {
    title: 'Stealth Addresses',
    description:
      'Every payment goes to a fresh one-time address. No link between sender and recipient.',
  },
  {
    title: 'Multichain',
    description:
      'One SDK, multiple chains. EVM (Horizen, Ethereum, Polygon) and Stellar today. More coming.',
  },
  {
    title: 'AI Agents',
    description:
      'Managed AI agents that handle stealth payments, scanning, and privacy analysis inside TEE hardware.',
  },
];

export default function Features() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="border border-outline-variant bg-surface-container p-8"
          >
            <h3 className="font-heading text-lg font-semibold text-on-surface">{feature.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
