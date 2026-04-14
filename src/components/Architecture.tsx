export default function Architecture() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-center text-3xl font-bold text-on-surface md:text-4xl">
          How it works
        </h2>
        <p className="mt-4 text-center text-on-surface-variant">
          App → SDK → Gateway → Spectre TEE → Chains
        </p>
        <div className="mt-12 border border-outline-variant bg-surface-container p-8">
          <img
            src="/architecture.svg"
            alt="Wraith Protocol architecture diagram showing the flow from your app through the SDK, Gateway, and Spectre TEE to multiple blockchains"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
