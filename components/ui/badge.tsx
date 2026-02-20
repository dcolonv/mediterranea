import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 text-xs font-medium tracking-wider uppercase',
        {
          'bg-white-10 text-white-70': variant === 'default',
          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30': variant === 'pending',
          'bg-blue-500/20 text-blue-400 border border-blue-500/30': variant === 'confirmed',
          'bg-green-500/20 text-green-400 border border-green-500/30': variant === 'completed',
          'bg-red-500/20 text-red-400 border border-red-500/30': variant === 'cancelled',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
