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
        bg-purple-800 text-white shadow-lg
        hover:bg-purple-900
        disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none
      `,
      secondary: `
        bg-white text-gray-900 border border-gray-200
        hover:bg-stone-100
      `,
      ghost: `
        bg-transparent text-purple-800
        hover:bg-purple-100
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
