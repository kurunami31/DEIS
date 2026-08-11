export function Logo({ size = 40, className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#14437B" />
        <circle cx="32" cy="32" r="22.5" fill="none" stroke="#E9781B" strokeWidth="2.5" />
        <path
          d="M18 38 L26 26 Q32 20 38 26 L46 38"
          fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="32" cy="32" r="3" fill="#E9781B" />
        <path d="M32 35 V42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 42 H38" stroke="#E9781B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}