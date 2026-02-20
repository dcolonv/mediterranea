import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'elegant';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium tracking-wider uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gold text-dark-900 hover:bg-gold-light': variant === 'primary',
            'bg-white text-dark-900 hover:bg-white-90': variant === 'secondary',
            'border border-white-30 bg-transparent text-white hover:bg-white-10 hover:border-white-50': variant === 'outline',
            'bg-transparent text-white hover:text-gold': variant === 'ghost',
            'border border-gold bg-transparent text-gold hover:bg-gold hover:text-dark-900': variant === 'elegant',
          },
          {
            'h-9 px-5 text-xs': size === 'sm',
            'h-12 px-8 text-sm': size === 'md',
            'h-14 px-10 text-sm': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
