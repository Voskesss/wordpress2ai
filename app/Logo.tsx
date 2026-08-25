export function LogoIcoon({ maat = 36 }: { maat?: number }) {
  return (
    <svg width={maat} height={maat} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="ws-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <path
        d="M18 24a16 16 0 0 1 27-3"
        fill="none"
        stroke="url(#ws-grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M46 12v9h-9"
        fill="none"
        stroke="url(#ws-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 40a16 16 0 0 1-27 3"
        fill="none"
        stroke="url(#ws-grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M18 52v-9h9"
        fill="none"
        stroke="url(#ws-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 26l1.8 4.2L38 32l-4.2 1.8L32 38l-1.8-4.2L26 32l4.2-1.8z"
        fill="#f6c453"
      />
    </svg>
  );
}

export function LogoWoordmerk({ klein = false }: { klein?: boolean }) {
  return (
    <span
      className={`inline-flex items-baseline ${klein ? "text-xl" : "text-2xl"}`}
    >
      <span className="font-[family-name:var(--font-garamond)] font-semibold text-[#464342]">
        Word
      </span>
      <span className="font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
        swap
      </span>
    </span>
  );
}

export default function Logo({ klein = false }: { klein?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoIcoon maat={klein ? 30 : 36} />
      <LogoWoordmerk klein={klein} />
    </span>
  );
}
