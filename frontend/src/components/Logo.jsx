export function Logo({ size = 40, className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src="/dorsu-seal.png"
        alt="DOrSU"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
}