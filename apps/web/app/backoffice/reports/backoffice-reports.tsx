'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '@mediterranea/shared/utils';
import { getReports, type ReportData } from '@/actions/reports';

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
];

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function BackofficeReports() {
  const [rangeDays, setRangeDays] = useState(30);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getReports(rangeDays);
    if (res.success) setReport(res.data);
    setLoading(false);
  }, [rangeDays]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-8 flex border border-white-10">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setRangeDays(r.days)}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              rangeDays === r.days ? 'bg-gold text-charcoal' : 'text-white-50 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading || !report ? (
        <div className="py-24 text-center text-white-50">Loading…</div>
      ) : (
        <div className="space-y-10">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Revenue" value={formatPrice(report.revenue)} hint="completed" />
            <Stat label="Completed" value={String(report.counts.completed)} />
            <Stat label="Upcoming" value={String(report.counts.upcoming)} />
            <Stat label="No-show rate" value={pct(report.noShowRate)} hint={`${report.counts.noShow} no-shows`} />
            <Stat label="Repeat clients" value={pct(report.retention.repeatRate)} hint={`${report.retention.repeatCustomers}/${report.retention.customersWithVisit}`} />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Popular treatments */}
            <Panel title="Popular treatments">
              {report.popularTreatments.length === 0 ? (
                <Empty />
              ) : (
                <BarList
                  items={report.popularTreatments.map((t) => ({ label: t.name, value: t.count }))}
                  format={(v) => String(v)}
                />
              )}
            </Panel>

            {/* Staff performance */}
            <Panel title="Practitioner revenue">
              {report.staffPerformance.length === 0 ? (
                <Empty />
              ) : (
                <BarList
                  items={report.staffPerformance.map((s) => ({ label: `${s.name} · ${s.completed}`, value: s.revenue }))}
                  format={(v) => formatPrice(v)}
                />
              )}
            </Panel>
          </div>

          <p className="text-xs text-white-30">
            {report.startDate} → {report.endDate}. Retention is all-time.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-white-10 bg-dark-800 p-4">
      <div className="text-2xl font-serif text-white">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white-50">{label}</div>
      {hint && <div className="text-[10px] text-white-30">{hint}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white-10 bg-dark-800 p-6">
      <h3 className="mb-4 font-serif text-lg text-white">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-white-30">No data for this period.</p>;
}

function BarList({ items, format }: { items: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-sm">
            <span className="truncate text-white-70">{i.label}</span>
            <span className="ml-3 shrink-0 text-white">{format(i.value)}</span>
          </div>
          <div className="mt-1 h-1.5 bg-white-10">
            <div className="h-full bg-gold" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
