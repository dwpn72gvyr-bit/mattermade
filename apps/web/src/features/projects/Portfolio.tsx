// Portfolio profitability (§8.1): a sortable table, because tables are the
// honest chart. Money renders masked for those outside its access (R6).

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getPortfolio, type PortfolioRow } from '../../api/queries';
import { Button, EmptyState, LedgerTable, Masked, PageHeader, StatusChip, Td, Th } from '../../components/ui';
import { fmtMoneyWhole, fmtPct } from '../../lib/format';

type SortKey = 'name' | 'status' | 'fee' | 'cost' | 'gp' | 'margin' | 'pph' | 'hours';

function MoneyCell(props: { m: PortfolioRow['fee']; currency: string; negative?: boolean }) {
  if ('maskedAs' in props.m) return <Masked as={props.m.maskedAs} />;
  return (
    <span className={props.m.value < 0 ? 'text-critical' : ''}>
      {fmtMoneyWhole(props.m.value, props.currency)}
    </span>
  );
}

const STATUS_TONE: Record<string, 'positive' | 'caution' | 'critical' | 'info' | 'neutral'> = {
  active: 'positive', planning: 'info', estimating: 'info', quoted: 'info',
  on_hold: 'caution', completed: 'neutral', financially_closed: 'neutral',
  archived: 'neutral', lost: 'neutral', won: 'positive', negotiation: 'info', opportunity: 'info',
};

export default function Portfolio() {
  const account = useAccount();
  const portfolio = useQuery({
    queryKey: ['portfolio', account.userId],
    queryFn: () => getPortfolio(account),
  });
  const [sort, setSort] = useState<SortKey>('status');
  const [dir, setDir] = useState<1 | -1>(1);

  const rows = useMemo(() => {
    const data = [...(portfolio.data ?? [])];
    const num = (m: PortfolioRow['fee']) => ('value' in m ? m.value : Number.NEGATIVE_INFINITY);
    const keyFn: Record<SortKey, (r: PortfolioRow) => string | number> = {
      name: (r) => r.project.name,
      status: (r) => r.project.status,
      fee: (r) => num(r.fee),
      cost: (r) => num(r.actualCost),
      gp: (r) => num(r.grossProfit),
      margin: (r) => ('value' in r.margin ? r.margin.value : Number.NEGATIVE_INFINITY),
      pph: (r) => num(r.profitPerHour),
      hours: (r) => r.metrics.actInternalHours,
    };
    data.sort((a, b) => {
      const ka = keyFn[sort](a);
      const kb = keyFn[sort](b);
      return (ka < kb ? -1 : ka > kb ? 1 : 0) * dir;
    });
    return data;
  }, [portfolio.data, sort, dir]);

  const toggle = (k: SortKey) => {
    if (sort === k) setDir(dir === 1 ? -1 : 1);
    else { setSort(k); setDir(1); }
  };

  if (portfolio.isSuccess && rows.length === 0) {
    return (
      <EmptyState
        title="No projects here yet."
        body="The first one you add starts the studio's memory."
        action={
          ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r)) ? (
            <Link to="/projects/new"><Button variant="primary">Add the first project</Button></Link>
          ) : undefined
        }
      />
    );
  }

  const seesMoney = rows.some((r) => 'value' in r.fee);

  const SortTh = (p: { k: SortKey; children: React.ReactNode; num?: boolean }) => (
    <Th num={p.num}>
      <button className="hover:text-ink inline-flex items-center gap-1" onClick={() => toggle(p.k)}>
        {p.children}
        {sort === p.k && <span aria-hidden="true">{dir === 1 ? '↑' : '↓'}</span>}
      </button>
    </Th>
  );

  return (
    <div>
      <PageHeader
        title="Portfolio"
        lede={
          seesMoney
            ? 'Every project, its cost structure and its profitability, in one place. Every figure drills to its inputs.'
            : 'Your projects and how their hours are tracking.'
        }
        actions={
          ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r)) && (
            <Link to="/projects/new">
              <Button variant="primary">New project</Button>
            </Link>
          )
        }
      />
      <LedgerTable
        caption="Portfolio profitability"
        head={
          <tr>
            <SortTh k="name">Project</SortTh>
            <SortTh k="status">Status</SortTh>
            <SortTh k="fee" num>Fee</SortTh>
            <SortTh k="cost" num>Actual cost</SortTh>
            <SortTh k="gp" num>Gross profit</SortTh>
            <SortTh k="margin" num>Margin</SortTh>
            <SortTh k="pph" num>Profit/hr</SortTh>
            <SortTh k="hours" num>Hours</SortTh>
            <Th>Health</Th>
          </tr>
        }
      >
        {rows.map((r) => {
          const m = r.metrics;
          const hot = m.hoursConsumedPct !== undefined && m.hoursConsumedPct - m.scheduleElapsedPct >= 0.15;
          const loss = 'value' in r.grossProfit && r.grossProfit.value < 0;
          return (
            <tr key={r.project.id} className="hover:bg-sunken/40">
              <Td>
                <Link to={`/projects/${r.project.id}`} className="font-medium hover:text-accent">
                  {r.project.name}
                </Link>
                <div className="text-xs text-ink-faint">{r.project.code} · {r.project.currency}{r.project.isProBono ? ' · pro bono' : ''}</div>
              </Td>
              <Td><StatusChip tone={STATUS_TONE[r.project.status] ?? 'neutral'}>{r.project.status.replace(/_/g, ' ')}</StatusChip></Td>
              <Td num><MoneyCell m={r.fee} currency={r.project.currency} /></Td>
              <Td num><MoneyCell m={r.actualCost} currency={r.project.currency} /></Td>
              <Td num><MoneyCell m={r.grossProfit} currency={r.project.currency} /></Td>
              <Td num>
                {'maskedAs' in r.margin ? <Masked as={r.margin.maskedAs} /> : (
                  <span className={r.margin.value < 0 ? 'text-critical' : ''}>{fmtPct(r.margin.value)}</span>
                )}
              </Td>
              <Td num>
                {'maskedAs' in r.profitPerHour ? <Masked as={r.profitPerHour.maskedAs} /> : (
                  <span className={r.profitPerHour.value < 0 ? 'text-critical' : ''}>
                    {'$'}{(r.profitPerHour.value / 100).toFixed(2)}
                  </span>
                )}
              </Td>
              <Td num>{m.actInternalHours.toFixed(0)}</Td>
              <Td>
                {loss ? (
                  <StatusChip tone="critical">Loss-making</StatusChip>
                ) : hot ? (
                  <StatusChip tone="caution">Running hot</StatusChip>
                ) : ['active', 'planning'].includes(r.project.status) ? (
                  <StatusChip tone="positive">On track</StatusChip>
                ) : (
                  <StatusChip tone="neutral">—</StatusChip>
                )}
              </Td>
            </tr>
          );
        })}
      </LedgerTable>
      {seesMoney && (
        <p className="text-xs text-ink-faint mt-3">
          Fees and costs shown in project currency. Gross margin against recognised revenue.
          The legacy third-party margin lens lives on each project's financial tab, beside the
          true margin it can disguise.
        </p>
      )}
    </div>
  );
}
