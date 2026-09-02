import { formatPrice } from '@mediterranea/shared/utils';
import { cn } from '@/lib/utils';

/**
 * Shows a price, and when a lower first-visit price applies, renders the regular
 * price struck through next to the first-visit price plus a small label.
 */
export function PriceTag({
  price,
  firstPrice = 0,
  from = false,
  fromLabel,
  firstLabel,
  className,
}: {
  price: number;
  /** First-visit price; only shown when > 0 and below `price`. */
  firstPrice?: number;
  /** Prefix the price with a "from" word (for group ranges). */
  from?: boolean;
  fromLabel?: string;
  firstLabel: string;
  className?: string;
}) {
  const hasIntro = firstPrice > 0 && firstPrice < price;

  return (
    <span className={cn('text-right leading-tight', className)}>
      <span className="whitespace-nowrap">
        {from && fromLabel && <span className="text-white-30">{fromLabel} </span>}
        {hasIntro && <span className="text-white-30 line-through">{formatPrice(price)}</span>}{' '}
        <span className="text-gold">{formatPrice(hasIntro ? firstPrice : price)}</span>
      </span>
      {hasIntro && (
        <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-gold/70">
          {firstLabel}
        </span>
      )}
    </span>
  );
}
