export default function CtaStrip() {
  return (
    <section className="flex flex-col items-start justify-between gap-8 border-y border-outline-variant bg-surface-container px-6 py-[72px] sm:flex-row sm:items-center md:px-12">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
          Ready to Build
        </span>
        <h2 className="font-heading text-[24px] font-bold tracking-[-0.8px] text-on-surface sm:text-[32px]">
          Start shipping private payments today.
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="https://console.usewraith.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center bg-primary px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] duration-150 hover:brightness-110"
        >
          Get API Key
        </a>
        <a
          href="https://docs.usewraith.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center border border-outline-variant px-7 font-heading text-[13px] font-semibold uppercase tracking-[1.5px] text-primary transition-colors duration-150 hover:bg-surface-bright"
        >
          Read the Docs
        </a>
      </div>
    </section>
  );
}
