// Core design-system primitives (§9). Personal surfaces run warmer and rounder,
// financial surfaces tighter and cooler: same tokens, different radius scales.

import React from 'react';

type Temp = 'personal' | 'financial';

export function Card(props: {
  children: React.ReactNode;
  temp?: Temp;
  className?: string;
  as?: 'div' | 'section';
}) {
  const radius = props.temp === 'personal' ? 'rounded-personal' : 'rounded-financial';
  const Tag = props.as ?? 'div';
  return (
    <Tag className={`bg-raised border border-line ${radius} p-5 ${props.className ?? ''}`}>
      {props.children}
    </Tag>
  );
}

export function PageHeader(props: {
  title: string;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { label: string; to?: string }[];
}) {
  return (
    <header className="mb-6 settle-in">
      {props.crumbs && props.crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-sm text-ink-muted mb-1">
          {props.crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span aria-hidden="true"> / </span>}
              {c.label}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-xl text-ink">{props.title}</h1>
          {props.lede && <p className="text-ink-muted mt-1 max-w-2xl">{props.lede}</p>}
        </div>
        {props.actions && <div className="flex gap-2 items-center">{props.actions}</div>}
      </div>
    </header>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
}) {
  const { variant = 'secondary', size = 'md', className, ...rest } = props;
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-financial font-medium transition-colors duration-settle disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'text-sm px-2.5 py-1' : 'text-base px-3.5 py-1.5 min-h-[36px]';
  const variants = {
    primary: 'bg-accent text-white hover:bg-[#33503f]',
    secondary: 'bg-raised border border-line text-ink hover:bg-sunken',
    quiet: 'text-ink-muted hover:text-ink hover:bg-sunken',
    danger: 'bg-critical text-white hover:bg-[#8f3a28]',
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className ?? ''}`} {...rest} />;
}

/** Status is never colour alone: chips carry an icon and a word (§9.6). */
export function StatusChip(props: {
  tone: 'positive' | 'caution' | 'critical' | 'info' | 'neutral';
  children: React.ReactNode;
}) {
  const tones = {
    positive: 'text-positive border-positive/40 bg-positive/5',
    caution: 'text-caution border-caution/40 bg-caution/5',
    critical: 'text-critical border-critical/40 bg-critical/5',
    info: 'text-info border-info/40 bg-info/5',
    neutral: 'text-ink-muted border-line bg-sunken',
  }[props.tone];
  const icon = { positive: '●', caution: '◆', critical: '▲', info: '○', neutral: '—' }[props.tone];
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-medium ${tones}`}>
      <span aria-hidden="true" className="text-[9px]">{icon}</span>
      {props.children}
    </span>
  );
}

/** The <Masked> renderer (§7): a value the user may not see never reaches the
 *  client; this renders the shape of the refusal, calmly. */
export function Masked(props: { label?: string; as?: 'aggregate' | 'range' | 'percentage' | 'hidden' }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-ink-faint select-none"
      title={props.label ?? 'Not part of your access'}
      aria-label={props.label ?? 'This value is not part of your access'}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="tracking-widest">•••</span>
    </span>
  );
}

export function EmptyState(props: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <p className="display text-lg text-ink">{props.title}</p>
      {props.body && <p className="text-ink-muted mt-2 max-w-md mx-auto">{props.body}</p>}
      {props.action && <div className="mt-4">{props.action}</div>}
    </div>
  );
}

/** Stat card for the cockpit and health cards; money and hours are tabular. */
export function Stat(props: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'positive' | 'caution' | 'critical';
  drillTo?: string;
}) {
  const tone = {
    default: 'text-ink', positive: 'text-positive', caution: 'text-caution', critical: 'text-critical',
  }[props.tone ?? 'default'];
  return (
    <div className="min-w-0">
      <div className="text-sm text-ink-muted">{props.label}</div>
      <div className={`tabular text-lg font-medium mt-0.5 ${tone}`}>{props.value}</div>
      {props.sub && <div className="text-xs text-ink-faint mt-0.5">{props.sub}</div>}
    </div>
  );
}

/** Budget burn: progress bar with contingency zone and threshold ticks at 85
 *  and 100% (§9.3). Never red for a person, only for money and deadlines. */
export function BurnBar(props: {
  pct: number;                 // decimal, may exceed 1
  scheduleElapsedPct?: number; // tick mark
  label: string;               // screen-reader summary sentence (§9.3)
}) {
  const pct = Math.max(0, props.pct);
  const fill = Math.min(1, pct);
  const tone = pct >= 1 ? 'bg-critical' : pct >= 0.85 ? 'bg-caution' : 'bg-accent';
  return (
    <div role="img" aria-label={props.label} className="relative h-3 bg-sunken rounded-full overflow-hidden border border-line">
      <div className={`h-full ${tone} transition-all duration-settle`} style={{ width: `${fill * 100}%` }} />
      <div className="absolute inset-y-0 border-l border-ink/30" style={{ left: '85%' }} aria-hidden="true" />
      {props.scheduleElapsedPct !== undefined && (
        <div
          className="absolute -inset-y-0.5 border-l-2 border-ink"
          style={{ left: `${Math.min(100, props.scheduleElapsedPct * 100)}%` }}
          aria-hidden="true"
          title="Timeline elapsed"
        />
      )}
    </div>
  );
}

/** Paired horizontal estimate-versus-actual bars with schedule tick: the single
 *  reusable comparison component, because it appears everywhere (§9.3). */
export function EstimateVsActual(props: {
  label: string;
  estHours: number;
  actHours: number;
  scheduleElapsedPct?: number;
  srSummary: string;
}) {
  const max = Math.max(props.estHours, props.actHours, 1);
  return (
    <div role="img" aria-label={props.srSummary} className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-ink">{props.label}</span>
        <span className="tabular text-ink-muted">
          {props.actHours} of {props.estHours}h
        </span>
      </div>
      <div className="relative space-y-0.5">
        <div className="h-2 bg-sunken rounded-sm overflow-hidden">
          <div className="h-full bg-line" style={{ width: `${(props.estHours / max) * 100}%` }} />
        </div>
        <div className="h-2 bg-sunken rounded-sm overflow-hidden">
          <div
            className={`h-full ${props.actHours > props.estHours ? 'bg-critical' : 'bg-accent'}`}
            style={{ width: `${(props.actHours / max) * 100}%` }}
          />
        </div>
        {props.scheduleElapsedPct !== undefined && (
          <div
            className="absolute -inset-y-0.5 border-l-2 border-ink"
            style={{ left: `${Math.min(100, props.scheduleElapsedPct * (props.estHours / max) * 100)}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/** Tables are the honest chart (§8.1). Sticky header, footer totals slot. */
export function LedgerTable(props: {
  head: React.ReactNode;
  children: React.ReactNode;
  foot?: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto border border-line rounded-financial bg-raised ${props.className ?? ''}`}>
      <table className="w-full text-base">
        {props.caption && <caption className="sr-only">{props.caption}</caption>}
        <thead className="sticky top-0 bg-sunken text-sm text-ink-muted">
          {props.head}
        </thead>
        <tbody className="divide-y divide-line/60">{props.children}</tbody>
        {props.foot && <tfoot className="border-t border-line bg-sunken/60 font-medium">{props.foot}</tfoot>}
      </table>
    </div>
  );
}

export function Th(props: { children?: React.ReactNode; num?: boolean; className?: string }) {
  return (
    <th
      scope="col"
      className={`text-left px-3 py-2 font-medium whitespace-nowrap ${props.num ? 'text-right' : ''} ${props.className ?? ''}`}
    >
      {props.children}
    </th>
  );
}

export function Td(props: { children?: React.ReactNode; num?: boolean; className?: string; colSpan?: number }) {
  return (
    <td
      colSpan={props.colSpan}
      className={`px-3 py-2 align-top ${props.num ? 'text-right tabular whitespace-nowrap' : ''} ${props.className ?? ''}`}
    >
      {props.children}
    </td>
  );
}

/** Completion ring for the daily ritual (§8.1); eases, never bounces. */
export function CompletionRing(props: { pct: number; size?: number; label: string }) {
  const size = props.size ?? 64;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const raw = Math.max(0, props.pct);
  const pct = Math.min(1, raw);
  return (
    <svg width={size} height={size} role="img" aria-label={props.label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EDE6" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={raw > 1.05 ? '#B98A2E' : pct >= 1 ? '#4E7A52' : '#3D5A4C'} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="ring-progress"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="tabular" fontSize={size / 4.6} fill="#2B2B2B">
        {Math.round(raw * 100)}%
      </text>
    </svg>
  );
}

/** Banner for calm system messages; red is reserved for money and deadlines. */
export function Banner(props: { tone: 'info' | 'caution' | 'critical' | 'positive'; children: React.ReactNode; className?: string }) {
  const tones = {
    info: 'border-info/40 bg-info/5 text-info',
    caution: 'border-caution/40 bg-caution/5 text-[#8a6722]',
    critical: 'border-critical/40 bg-critical/5 text-critical',
    positive: 'border-positive/40 bg-positive/5 text-positive',
  }[props.tone];
  return (
    <div role="status" className={`border rounded-financial px-4 py-3 text-base ${tones} ${props.className ?? ''}`}>
      {props.children}
    </div>
  );
}
