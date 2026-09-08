export function LogoIcoon({ maat = 36 }: { maat?: number }) {
  return (
    <svg
      width={maat}
      height={maat}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="12" fill="#245747" />
      <path
        d="M10 15h19l-5-5M30 25H11l5 5"
        stroke="#E6F2B7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function LogoWoordmerk({ klein = false }: { klein?: boolean }) {
  return (
    <span
      className={`font-semibold tracking-[-0.055em] text-[#203c32] ${klein ? "text-2xl" : "text-4xl"}`}
    >
      wordswap<span className="text-[#c37850]">.</span>
    </span>
  );
}
export default function Logo({ klein = false }: { klein?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoIcoon maat={klein ? 34 : 46} />
      <LogoWoordmerk klein={klein} />
    </span>
  );
}
