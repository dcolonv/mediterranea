import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'dark' | 'light';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, variant = 'dark', ...props }, ref) => {
    const isDark = variant === 'dark';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'mb-2 block text-sm font-medium tracking-wide',
              isDark ? 'text-white-70' : 'text-charcoal'
            )}
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'flex h-12 w-full border px-4 py-2 text-base transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            isDark
              ? 'border-white-10 bg-dark-800 text-white placeholder:text-white-30 focus:border-gold'
              : 'border-warm-gray-300 bg-white text-charcoal placeholder:text-warm-gray-600 focus:border-gold focus:ring-1 focus:ring-gold',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
