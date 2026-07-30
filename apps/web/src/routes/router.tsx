// Route table. Feature stages replace the Placeholder components; the paths and
// shell are stable so stages can land independently.

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { EmptyState } from '../components/ui';

const Styleguide = lazy(() => import('./Styleguide'));

function Placeholder(props: { title: string; note?: string }) {
  return (
    <EmptyState
      title={props.title}
      body={props.note ?? 'This area arrives with a later build stage.'}
    />
  );
}

function lazyFeature(loader: () => Promise<{ default: React.ComponentType }>, fallbackTitle: string) {
  const C = lazy(loader);
  return (
    <Suspense fallback={<div className="text-ink-muted py-10 text-center">Loading…</div>}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: lazyFeature(() => import('../features/personal/Home'), 'Home') },
      { path: '/today', element: lazyFeature(() => import('../features/personal/Today'), 'Today') },
      { path: '/week', element: lazyFeature(() => import('../features/personal/Week'), 'Week') },
      { path: '/history', element: lazyFeature(() => import('../features/personal/History'), 'History') },
      { path: '/insights', element: lazyFeature(() => import('../features/personal/Insights'), 'Insights') },
      { path: '/profile', element: lazyFeature(() => import('../features/personal/Profile'), 'Profile') },
      { path: '/privacy', element: lazyFeature(() => import('../features/personal/Privacy'), 'Privacy') },
      { path: '/projects', element: lazyFeature(() => import('../features/projects/Portfolio'), 'Portfolio') },
      { path: '/projects/:projectId/*', element: lazyFeature(() => import('../features/projects/ProjectOverview'), 'Project') },
      { path: '/plan-quote', element: lazyFeature(() => import('../features/quote/PlanQuoteList'), 'Plan & Quote') },
      { path: '/plan-quote/:quoteId', element: lazyFeature(() => import('../features/quote/PlanQuoteFlow'), 'Plan & Quote') },
      { path: '/people', element: lazyFeature(() => import('../features/people/Directory'), 'Directory') },
      { path: '/people/:personId', element: lazyFeature(() => import('../features/people/PersonProfile'), 'Profile') },
      { path: '/verse', element: lazyFeature(() => import('../features/people/VerseDirectory'), 'OE Verse') },
      { path: '/verse/:collaboratorId', element: lazyFeature(() => import('../features/people/CollaboratorProfile'), 'Collaborator') },
      { path: '/verse-portal/*', element: lazyFeature(() => import('../features/verse-portal/Portal'), 'My work') },
      { path: '/company', element: lazyFeature(() => import('../features/company/Cockpit'), 'Cockpit') },
      { path: '/company/overheads', element: lazyFeature(() => import('../features/company/Overheads'), 'Overheads') },
      { path: '/company/time', element: lazyFeature(() => import('../features/company/TimeAllocation'), 'Time allocation') },
      { path: '/reports', element: lazyFeature(() => import('../features/reports/ReportLibrary'), 'Reports') },
      { path: '/admin/periods', element: lazyFeature(() => import('../features/admin/Periods'), 'Periods') },
      { path: '/admin/activities', element: lazyFeature(() => import('../features/admin/Activities'), 'Activities') },
      { path: '/admin/templates', element: lazyFeature(() => import('../features/admin/Templates'), 'Templates') },
      { path: '/admin/audit', element: lazyFeature(() => import('../features/admin/AuditLog'), 'Audit log') },
      { path: '/admin/settings', element: lazyFeature(() => import('../features/admin/Settings'), 'Settings') },
      {
        path: '/styleguide',
        element: (
          <Suspense fallback={<div className="text-ink-muted py-10 text-center">Loading…</div>}>
            <Styleguide />
          </Suspense>
        ),
      },
      { path: '*', element: <Placeholder title="Nothing lives at this address" note="The sidebar has every area that is part of your access." /> },
    ],
  },
]);
