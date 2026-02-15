interface LogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export function Logo({ showTagline = true, size = 'lg', variant = 'light' }: LogoProps) {
  const sizes = {
    sm: { mark: 'w-10 h-10', markText: 'text-lg', dot: 'w-2 h-2', title: 'text-lg', tagline: 'text-xs' },
    md: { mark: 'w-12 h-12', markText: 'text-xl', dot: 'w-2.5 h-2.5', title: 'text-xl', tagline: 'text-sm' },
    lg: { mark: 'w-14 h-14', markText: 'text-2xl', dot: 'w-3 h-3', title: 'text-2xl', tagline: 'text-sm' },
  };

  const s = sizes[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subtitleColor = variant === 'light' ? 'text-white/80' : 'text-gray-500';

  return (
    <div className="text-center">
      {/* Logo Mark: [ 2. ] */}
      <div className={`${s.mark} bg-primary-gradient rounded-xl flex items-center justify-center mx-auto mb-4 relative shadow-[0_4px_16px_rgba(124,58,237,0.3)]`}>
        <span className={`${s.markText} font-semibold text-white`}>2</span>
        {/* Honey Gold dot */}
        <div className={`${s.dot} bg-amber-400 rounded-full absolute bottom-2 right-2`} />
      </div>

      {/* Wordmark: My2Cents */}
      <h1 className={`${s.title} ${textColor} tracking-tight`}>
        <span className="font-normal">My</span>
        <span className="font-semibold">2Cents</span>
      </h1>

      {showTagline && (
        <p className={`${s.tagline} ${subtitleColor} mt-1 font-medium`}>
          Money, together
        </p>
      )}
    </div>
  );
}
