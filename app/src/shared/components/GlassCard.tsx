import type { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * GlassCard — The primary card component for the glass design system.
 *
 * - Default: Semi-transparent white bg with backdrop blur
 * - Elevated: Solid white gradient bg with stronger shadow (for hero/summary cards)
 * - Comes with the top shimmer highlight via CSS ::before
 */
export function GlassCard({ children, elevated = false, padding = 'md', className = '', ...props }: GlassCardProps) {
  return (
    <div
      className={`glass-card ${elevated ? 'glass-card-elevated' : ''} ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
