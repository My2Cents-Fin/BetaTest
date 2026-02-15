import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, fullWidth = true, children, disabled, className = '', ...props }, ref) => {
    const baseStyles = `
      relative flex items-center justify-center
      min-h-[48px] px-6 py-3
      rounded-xl font-semibold text-sm
      transition-all duration-150
      active:scale-[0.98]
    `;

    const variantStyles = {
      primary: `
        bg-primary-gradient text-white
        shadow-[0_4px_16px_rgba(124,58,237,0.3)]
        hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)]
        hover:-translate-y-0.5
        disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
      `,
      secondary: `
        bg-white/75 text-gray-900
        border border-[rgba(124,58,237,0.15)]
        backdrop-blur-md
        shadow-[0_2px_12px_rgba(0,0,0,0.04)]
        hover:bg-white/90
      `,
      ghost: `
        bg-transparent text-[var(--color-primary)]
        hover:bg-[var(--color-primary-bg)]
      `,
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="opacity-0">{children}</span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
