// The privacy page, shipped at launch, in the navigation, shown during
// onboarding (§7.6). The text below is used verbatim from the master prompt.

import React from 'react';
import { Card, PageHeader } from '../../components/ui';

export default function Privacy() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Your time, plainly"
        lede="What this console records, who sees it, and what it will never be used for."
      />
      <Card temp="personal" className="space-y-5 text-base leading-relaxed">
        <section>
          <h2 className="display text-lg mb-1">Why we ask you to map your time.</h2>
          <p>
            So OuterEdit prices projects honestly, protects you from chronic over-servicing,
            staffs projects fairly, and builds the stability that funds salaries, bonuses and
            growth. Your time makes the argument that a timeline was unrealistic, so you do
            not have to.
          </p>
        </section>
        <section>
          <h2 className="display text-lg mb-1">Who sees what.</h2>
          <p>
            You see everything of yours. Your project lead sees hours recorded on their
            project. Your manager sees your weekly totals and gaps, never your notes. Finance
            sees costed totals. Nobody but you ever sees your breaks, meals, commute, or
            personal insights.
          </p>
        </section>
        <section>
          <h2 className="display text-lg mb-1">What it is used for.</h2>
          <p>Project costing, fair pricing, capacity planning, company financial health.</p>
        </section>
        <section>
          <h2 className="display text-lg mb-1">What it will never be used for.</h2>
          <p>
            Ranking people. Performance scores. Surveillance. There are no screenshots, no
            keystroke logging, no idle tracking, and no leaderboards, and the system is built
            so they cannot be quietly added.
          </p>
        </section>
        <section>
          <h2 className="display text-lg mb-1">Corrections.</h2>
          <p>
            Edit freely until a month closes. After that, corrections are recorded as dated
            adjustments so history stays honest.
          </p>
        </section>
        <section>
          <h2 className="display text-lg mb-1">Retention.</h2>
          <p>
            Time and project records are kept as long-term business records. Your personal
            contextual entries are yours, and you can delete them at any time.
          </p>
        </section>
      </Card>
    </div>
  );
}
