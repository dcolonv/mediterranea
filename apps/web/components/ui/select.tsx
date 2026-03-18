import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'dark' | 'light';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, variant = 'dark', ...props }, ref) => {
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
        <select
          id={id}
          ref={ref}
          className={cn(
            'flex h-12 w-full appearance-none border px-4 py-2 text-base transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            isDark
              ? 'border-white-10 bg-dark-800 text-white focus:border-gold'
              : 'border-warm-gray-300 bg-white text-charcoal focus:border-gold focus:ring-1 focus:ring-gold',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${isDark ? '%23ffffff50' : '%236b6560'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
