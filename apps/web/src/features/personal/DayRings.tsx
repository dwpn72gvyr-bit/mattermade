// DayRings (client direction, item 13): a quiet, Apple-fitness-style wall of
// small completion rings, one per scheduled workday or month. Private to the
// owner, no comparisons, no scores (R7). Rings only ever use the shared
// CompletionRing tones: accent while in progress, positive when complete,
// caution only past 105 percent because overtime is effort, not an error.

import React from 'react';
import { CompletionRing } from '../../components/ui';

export interface DayRingItem {
  /** Stable identity: a calendar date (YYYY-MM-DD) or a month (YYYY-MM). */
  key: string;
  /** mapped / scheduled, may exceed 1. */
  pct: number;
  /** Full accessible description, e.g. "Tue 12 Aug, 75 percent mapped". */
  label: string;
  /** Short caption under the ring, e.g. "12", "Mon" or "Aug". */
  caption: string;
}

export default function DayRings(props: {
  items: DayRingItem[];
  /** Ring diameter in px; the wall runs small by design. */
  size?: number;
  /** Currently opened ring, highlighted gently. */
  selectedKey?: string | null;
  /** When present, rings become buttons that toggle the inline detail. */
  onSelect?: (key: string) => void;
  /** Shown instead of the wall when there is nothing to draw yet. */
  emptyNote?: string;
}) {
  const size = props.size ?? 44;

  if (props.items.length === 0) {
    return props.emptyNote ? (
      <p className="text-sm text-ink-muted">{props.emptyNote}</p>
    ) : null;
  }

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 16}px, 1fr))` }}
    >
      {props.items.map((item) => {
        const selected = props.selectedKey === item.key;
        const body = (
          <>
            <CompletionRing pct={item.pct} size={size} label={item.label} />
            <span className="text-xs text-ink-muted">{item.caption}</span>
          </>
        );
        if (!props.onSelect) {
          return (
            <div key={item.key} className="flex flex-col items-center gap-0.5 p-1.5">
              {body}
            </div>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-expanded={selected}
            onClick={() => props.onSelect!(item.key)}
            className={`flex flex-col items-center gap-0.5 rounded-personal p-1.5 transition-colors duration-settle hover:bg-sunken ${
              selected ? 'bg-sunken ring-1 ring-accent/40' : ''
            }`}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
