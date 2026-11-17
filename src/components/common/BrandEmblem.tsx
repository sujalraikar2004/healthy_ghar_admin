export function BrandEmblem({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs shrink-0`}
      aria-label="Healthy Ghar Brand Emblem"
    >
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
        <rect x="13" y="5" width="6" height="22" rx="2" fill="currentColor" />
        <rect x="5" y="13" width="22" height="6" rx="2" fill="currentColor" />
        <circle cx="24" cy="8" r="3" fill="#9cf2e8" />
      </svg>
    </div>
  );
}

export function StaffAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .replace(/^Dr\.\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

  const sizeClass =
    size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-12 h-12 text-[15px]' : 'w-8 h-8 text-[12px]';

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center shrink-0 border border-primary/15`}
    >
      {initials || 'HG'}
    </div>
  );
}
