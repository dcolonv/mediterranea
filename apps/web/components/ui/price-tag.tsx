import { formatPrice, payablePrice } from '@mediterranea/shared/utils';
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
  const payable = payablePrice({ price, firstVisitPrice: firstPrice });
  const hasIntro = payable < price;

  return (
    <span className={cn('text-right leading-tight', className)}>
      <span>
        {from && fromLabel && <span className="text-white-30">{fromLabel} </span>}
        {hasIntro && (
          <span className="whitespace-nowrap text-white-30 line-through">{formatPrice(price)}</span>
        )}{' '}
        <span className="whitespace-nowrap text-gold">{formatPrice(payable)}</span>
      </span>
      {hasIntro && (
        <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-gold/70">
          {firstLabel}
        </span>
      )}
    </span>
  );
}
