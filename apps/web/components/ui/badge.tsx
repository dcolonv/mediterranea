import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'pending'
    | 'confirmed'
    | 'checked-in'
    | 'completed'
    | 'cancelled'
    | 'rejected'
    | 'no-show';
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
          'bg-purple-500/20 text-purple-400 border border-purple-500/30': variant === 'checked-in',
          'bg-green-500/20 text-green-400 border border-green-500/30': variant === 'completed',
          'bg-red-500/20 text-red-400 border border-red-500/30':
            variant === 'cancelled' || variant === 'rejected',
          'bg-white-10 text-white-50 border border-white-20 line-through decoration-white-30': variant === 'no-show',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
