import { useRef, useEffect } from 'react';
import type { KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  length?: number;
  masked?: boolean;
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  length = 6,
  masked = false,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of digits
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  // Focus first empty input on mount
  useEffect(() => {
    const firstEmptyIndex = digits.findIndex((d) => !d);
    const indexToFocus = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    inputRefs.current[indexToFocus]?.focus();
  }, []);

  // Check for completion
  useEffect(() => {
    if (value.length === length && /^\d+$/.test(value) && onComplete) {
      // Brief delay for UX
      const timer = setTimeout(() => {
        onComplete(value);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, '');

    if (!inputValue) {
      // Clear this digit
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    // Take only first digit
    const digit = inputValue[0];
    const newDigits = [...digits];
    newDigits[index] = digit;
    onChange(newDigits.join(''));

    // Auto-advance to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData.length > 0) {
      onChange(pastedData);
      // Focus last input or appropriate one
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          className={`
            w-11 h-14 sm:w-12 sm:h-14
            border rounded-xl
            text-center text-xl sm:text-2xl font-semibold
            text-gray-900 bg-white/75
            transition-all duration-150
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-[var(--color-danger)] bg-red-50 animate-shake' : 'border-[rgba(124,58,237,0.15)]'}
            ${digit && !error ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' : ''}
          `}
          style={masked && digit ? { WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties : undefined}
        />
      ))}
    </div>
  );
}
