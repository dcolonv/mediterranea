'use client';

import { PriceTag } from '@/components/ui';

/** A selectable treatment card: a single service or a group of them. */
export function GroupCard({
  title,
  hint,
  description,
  price,
  firstPrice,
  from,
  fromLabel,
  firstLabel,
  badge,
  onClick,
}: {
  title: string;
  hint: string;
  description: string;
  price: number;
  firstPrice?: number;
  from?: boolean;
  fromLabel?: string;
  firstLabel: string;
  /** Optional tag shown above the title (e.g. "Seasonal"). */
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col border border-white-10 p-6 text-left transition-colors hover:border-gold/40"
    >
      {badge && (
        <span className="mb-2 inline-flex w-fit border border-gold/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          {badge}
        </span>
      )}
      {/* Stacked on small screens so long names and the price never collide. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="font-serif text-lg text-white transition-colors group-hover:text-gold">
          {title}
        </span>
        <PriceTag
          price={price}
          firstPrice={firstPrice}
          from={from}
          fromLabel={fromLabel}
          firstLabel={firstLabel}
          className="shrink-0 text-left sm:text-right"
        />
      </div>
      <span className="mt-1 text-xs uppercase tracking-wider text-white-30">{hint}</span>
      <span className="mt-3 text-sm font-light leading-relaxed text-white-50">{description}</span>
    </button>
  );
}
