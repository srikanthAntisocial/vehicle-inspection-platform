interface Props {
  angle: string;
  className?: string;
}

/** Compact SVG illustrations representing each of the 11 capture angles. */
export function AngleIllustration({ angle, className }: Props) {
  const stroke = "currentColor";
  switch (angle) {
    case "front":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <rect x="6" y="14" width="52" height="18" rx="3" stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="18" width="36" height="8" rx="1.5" stroke={stroke} strokeWidth="1.2" />
          <circle cx="14" cy="32" r="3" stroke={stroke} strokeWidth="1.2" />
          <circle cx="50" cy="32" r="3" stroke={stroke} strokeWidth="1.2" />
          <path d="M10 22h2M52 22h2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "rear":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <rect x="6" y="14" width="52" height="18" rx="3" stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="18" width="36" height="8" rx="1.5" stroke={stroke} strokeWidth="1.2" />
          <circle cx="14" cy="32" r="3" stroke={stroke} strokeWidth="1.2" />
          <circle cx="50" cy="32" r="3" stroke={stroke} strokeWidth="1.2" />
          <rect x="9" y="20" width="3" height="2.5" fill={stroke} />
          <rect x="52" y="20" width="3" height="2.5" fill={stroke} />
        </svg>
      );
    case "left":
    case "right":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <path d="M4 28h6l4-10h36l4 10h6" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 28h36" stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="30" r="3" stroke={stroke} strokeWidth="1.2" />
          <circle cx="44" cy="30" r="3" stroke={stroke} strokeWidth="1.2" />
          <path d="M22 18l3-5h14l3 5" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case "front_left":
    case "front_right":
    case "rear_left":
    case "rear_right":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <path
            d="M8 30c4-2 8-3 14-3l12-9c4-3 10-3 14 0l8 6"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="30" r="3" stroke={stroke} strokeWidth="1.2" />
          <circle cx="48" cy="28" r="3" stroke={stroke} strokeWidth="1.2" />
          <path d="M22 24l8-6" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case "windshield":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <path d="M10 32l8-18h28l8 18" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 32h36" stroke={stroke} strokeWidth="1.5" />
          <path d="M20 30l4-12h16l4 12" stroke={stroke} strokeWidth="1" />
        </svg>
      );
    case "chassis_vin":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <rect x="8" y="14" width="48" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
          <path d="M14 20h6M14 24h12M30 22h20" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "odometer":
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none">
          <circle cx="32" cy="22" r="14" stroke={stroke} strokeWidth="1.5" />
          <path d="M32 22l8-6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 22h2M44 22h2M32 8v2M32 34v2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
