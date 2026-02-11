import { forwardRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { formatPhoneDisplay } from '../../../shared/utils/validation';
import { AUTH_CONFIG } from '../../../config/app.config';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onKeyDown, error, disabled }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      // Extract only digits and limit to 10
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      onChange(digits);
    };

    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-500 mb-2">
          Phone Number
        </label>
        <div
          className={`
            flex items-center
            border rounded-xl bg-white
            transition-all duration-150
            focus-within:border-purple-800 focus-within:ring-2 focus-within:ring-purple-200
            ${error ? 'border-red-500' : 'border-gray-200'}
          `}
        >
          {/* Country Code */}
          <div className="flex items-center gap-1.5 px-4 py-3 text-base font-medium text-gray-900 border-r border-gray-200 bg-stone-100 rounded-l-xl">
            <span className="text-lg">{AUTH_CONFIG.countryFlag}</span>
            <span>{AUTH_CONFIG.defaultCountryCode}</span>
          </div>

          {/* Phone Input */}
          <input
            ref={ref}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={formatPhoneDisplay(value)}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder="98765 43210"
            className="
              flex-1 px-4 py-3 min-h-[48px]
              border-none bg-transparent
              text-base font-medium text-gray-900 tracking-wide
              placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>
        {error && (
          <span className="block text-xs mt-1.5 text-red-500">{error}</span>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
