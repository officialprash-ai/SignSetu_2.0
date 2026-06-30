/**
 * SignSetu brand mark — a stylised signing hand inside a rounded gradient badge.
 * Scales cleanly (SVG), themes via a fixed brand gradient, crisp on light/dark.
 */
interface LogoProps {
  className?: string;
  title?: string;
}

export function Logo({ className = "w-8 h-8", title = "SignSetu" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="signsetu-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {/* Rounded badge */}
      <rect x="0" y="0" width="40" height="40" rx="11" fill="url(#signsetu-grad)" />

      {/* Signing hand — raised open palm */}
      <g fill="#ffffff">
        {/* palm + wrist */}
        <path d="M13.2 21.4c0-1 .8-1.8 1.8-1.8.5 0 1 .2 1.3.6V13c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v5.2a1.6 1.6 0 0 1 3.1 0v.9a1.6 1.6 0 0 1 3.1.5v5.7c0 3.4-2.7 6.2-6.2 6.2h-1.1c-2 0-3.8-1-5-2.6l-2.4-3.3a1.7 1.7 0 0 1 .4-2.4c.7-.5 1.7-.4 2.3.3l.4.5v-7.3" opacity="0.96" />
      </g>
      {/* Subtle motion arc (the "bridge") */}
      <path
        d="M27.5 12.5a8.5 8.5 0 0 1 0 9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export default Logo;
