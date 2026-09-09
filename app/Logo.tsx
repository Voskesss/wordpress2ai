/** The open, rising right stroke is shared by the wordmark and favicon. */
export function LogoIcoon({ maat = 36 }: { maat?: number }) {
  return (
    <svg width={maat} height={maat} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M4 9 12 31 20 13 28 31 34 15" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="m34 15 2-6" stroke="#31956B" strokeWidth="4.5" />
    </svg>
  );
}
export function LogoWoordmerk({ klein = false }: { klein?: boolean }) {
  return (
    <span aria-label="WordSwap" className={`inline-flex items-baseline font-bold tracking-[-0.055em] text-[#172E3B] ${klein ? "text-[29px]" : "text-[42px]"}`}>
      <span aria-hidden="true" className="inline-flex self-center mr-[-0.035em]">
        <LogoIcoon maat={klein ? 33 : 48} />
      </span>
      <span aria-hidden="true">ordswap<span className="text-[#31956B]">.</span></span>
    </span>
  );
}
export default function Logo({ klein = false }: { klein?: boolean }) {
  return <LogoWoordmerk klein={klein} />;
}
