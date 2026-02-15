import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', ...props }, ref) => {
    const inputStyles = `
      w-full px-4 py-3 min-h-[48px]
      border rounded-xl
      text-sm font-medium text-gray-900
      bg-white/75 backdrop-blur-sm
      transition-all duration-150
      placeholder:text-gray-400 placeholder:font-normal
      focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]
      ${error ? 'border-red-400 focus:ring-red-100' : 'border-[rgba(124,58,237,0.15)]'}
    `;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-500 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${inputStyles} ${className}`}
          {...props}
        />
        {(error || helper) && (
          <span className={`block text-xs mt-1.5 ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {error || helper}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
