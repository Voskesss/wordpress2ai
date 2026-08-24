export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 520 460"
      role="img"
      aria-label="Ondernemer die ontspannen met een kop koffie zijn website aanpast via chat"
      className="w-full max-w-lg mx-auto"
    >
      {/* Warme achtergrond-blob */}
      <path
        d="M260 18c110 0 218 62 228 172 10 108-70 232-228 232S18 322 32 200C44 96 150 18 260 18z"
        fill="#f3ede4"
      />
      {/* Zon */}
      <circle cx="112" cy="96" r="34" fill="#f6c453" />
      <circle cx="112" cy="96" r="46" fill="#f6c453" opacity="0.25" />

      {/* Plant */}
      <g>
        <path d="M424 330c0-38 18-58 18-58s16 22 14 58" fill="none" stroke="#7ba05b" strokeWidth="9" strokeLinecap="round" />
        <path d="M436 332c-4-28-26-40-26-40s-4 26 10 44" fill="none" stroke="#93b573" strokeWidth="8" strokeLinecap="round" />
        <path d="M414 372h52l-8 50h-36z" fill="#c96f4a" />
        <path d="M410 360h60v14h-60z" fill="#b45f3d" rx="4" />
      </g>

      {/* Tafel */}
      <rect x="60" y="356" width="330" height="16" rx="8" fill="#a8815f" />
      <rect x="86" y="372" width="14" height="70" rx="6" fill="#8f6b4c" />
      <rect x="330" y="372" width="14" height="70" rx="6" fill="#8f6b4c" />

      {/* Persoon */}
      <g>
        {/* romp / trui */}
        <path
          d="M158 356c0-52 34-84 76-84s76 32 76 84z"
          fill="#7c5cc4"
        />
        {/* hoofd */}
        <circle cx="234" cy="220" r="46" fill="#eab793" />
        {/* haar */}
        <path
          d="M188 214c2-34 22-54 46-54s44 20 46 54c-8-18-24-26-46-26s-38 8-46 26z"
          fill="#4a3628"
        />
        {/* glimlach */}
        <path
          d="M220 238c8 8 20 8 28 0"
          fill="none"
          stroke="#3f2d1e"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* ogen (blij, dicht) */}
        <path d="M212 220c4-5 10-5 14 0" fill="none" stroke="#3f2d1e" strokeWidth="4" strokeLinecap="round" />
        <path d="M244 220c4-5 10-5 14 0" fill="none" stroke="#3f2d1e" strokeWidth="4" strokeLinecap="round" />
        {/* blosjes */}
        <circle cx="204" cy="234" r="7" fill="#e59a76" opacity="0.6" />
        <circle cx="264" cy="234" r="7" fill="#e59a76" opacity="0.6" />
        {/* arm met mok */}
        <path
          d="M296 330c22-8 34-24 36-44"
          fill="none"
          stroke="#7c5cc4"
          strokeWidth="22"
          strokeLinecap="round"
        />
        {/* mok */}
        <rect x="316" y="256" width="40" height="34" rx="8" fill="#d9694d" />
        <path d="M356 264h10a10 10 0 0 1 0 20h-10" fill="none" stroke="#d9694d" strokeWidth="7" />
        {/* stoom */}
        <path d="M328 244c-3-8 3-10 0-18" fill="none" stroke="#b8afa2" strokeWidth="4" strokeLinecap="round" />
        <path d="M344 244c-3-8 3-10 0-18" fill="none" stroke="#b8afa2" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Telefoon op tafel met chat */}
      <g>
        <rect x="118" y="286" width="64" height="76" rx="10" fill="#292524" transform="rotate(-8 150 324)" />
        <rect x="124" y="292" width="52" height="64" rx="6" fill="#fdfbf7" transform="rotate(-8 150 324)" />
      </g>

      {/* Zwevende chatbubbels */}
      <g>
        <rect x="60" y="150" width="150" height="40" rx="20" fill="#7c5cc4" />
        <text x="135" y="176" textAnchor="middle" fill="#fff" fontSize="17" fontFamily="sans-serif">
          Nieuwe foto? 📸
        </text>
        <rect x="96" y="204" width="120" height="38" rx="19" fill="#ffffff" stroke="#e5ddd0" />
        <text x="156" y="229" textAnchor="middle" fill="#44403c" fontSize="16" fontFamily="sans-serif">
          Staat live ✓
        </text>
      </g>
    </svg>
  );
}
