// §7.1 aggregation floor: an aggregate that would reveal an individual by
// subtraction must contain at least 3 people, else a range or a roll-up.
// Project budget views: floor 2, percentage-only fallback below that.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { maskAggregate, maskProjectBudget, type ContributionMinor } from '../src';

const c = (personId: string, amountMinor: number): ContributionMinor => ({ personId, amountMinor });

describe('maskAggregate (§7.1, floor 3)', () => {
  it('a 3-person aggregate returns the exact value', () => {
    const view = maskAggregate([c('a', 100_00), c('b', 200_00), c('c', 300_00)]);
    expect(view).toEqual({ kind: 'value', amountMinor: 600_00, contributorCount: 3 });
  });

  it('a 2-person aggregate degrades to a range strictly containing the total', () => {
    const view = maskAggregate([c('a', 1_234_56), c('b', 2_345_67)]);
    expect(view.kind).toBe('range');
    if (view.kind === 'range') {
      expect(view.lowMinor).toBeLessThan(1_234_56 + 2_345_67);
      expect(view.highMinor).toBeGreaterThan(1_234_56 + 2_345_67);
    }
  });

  it('a 1-person aggregate never returns a value', () => {
    const view = maskAggregate([c('a', 5_000_00)]);
    expect(view.kind).not.toBe('value');
  });

  it('the same person appearing twice still counts as one contributor', () => {
    const view = maskAggregate([c('a', 100_00), c('a', 200_00), c('b', 50_00)]);
    expect(view.kind).not.toBe('value');
  });

  it('below the floor with below:"rolled_up" it rolls up a level', () => {
    expect(maskAggregate([c('a', 100_00), c('b', 200_00)], { below: 'rolled_up' })).toEqual({ kind: 'rolled_up' });
  });

  it('an exact-boundary total is still strictly inside its range (no leak at the endpoint)', () => {
    const view = maskAggregate([c('a', 60_000_00), c('b', 40_000_00)]); // total 100,000.00, a round number
    expect(view.kind).toBe('range');
    if (view.kind === 'range') {
      expect(view.lowMinor).toBeLessThan(100_000_00);
      expect(view.highMinor).toBeGreaterThan(100_000_00);
    }
  });

  it('never returns kind:"value" below the floor, always exact at or above it (property)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            personId: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
            amountMinor: fc.integer({ min: 1, max: 10_000_000 }),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        (values) => {
          const distinct = new Set(values.map((v) => v.personId)).size;
          const total = values.reduce((acc, v) => acc + v.amountMinor, 0);
          const view = maskAggregate(values);
          if (distinct >= 3) {
            return view.kind === 'value' && view.amountMinor === total;
          }
          if (view.kind === 'value') return false;
          if (view.kind === 'range') return view.lowMinor < total && total < view.highMinor;
          return true;
        },
      ),
    );
  });
});

describe('maskProjectBudget (§7.1, floor 2 with percentage fallback)', () => {
  it('two contributors return the exact consumed value', () => {
    const view = maskProjectBudget([c('a', 10_000_00), c('b', 20_000_00)], 100_000_00);
    expect(view).toEqual({ kind: 'value', amountMinor: 30_000_00, contributorCount: 2 });
  });

  it('one contributor falls back to a coarse percentage only', () => {
    const view = maskProjectBudget([c('a', 43_210_00)], 100_000_00);
    expect(view.kind).toBe('percentage');
    if (view.kind === 'percentage') {
      // Coarsened to 5-point steps so budget × pct cannot recover the rate.
      expect(Math.round(view.pct * 100) % 5).toBe(0);
      expect(view.pct * 100_000_00).not.toBe(43_210_00);
    }
  });

  it('zero contributors still never reveal a figure', () => {
    const view = maskProjectBudget([], 100_000_00);
    expect(view.kind).toBe('percentage');
  });
});
