import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hero' | 'glass' | 'glass-elevated';
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variants = {
    default: 'glass-card p-4',
    hero: 'bg-hero-gradient rounded-2xl py-6 px-5 text-white',
    glass: 'glass-card p-4',
    'glass-elevated': 'glass-card glass-card-elevated p-4',
  };

  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
