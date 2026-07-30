// fixtures/src/clauses.ts
// §5.2 clause library, seeded from OuterEdit's existing quotation practice.
// Voice rules apply (§9.4): no exclamation marks, no em dashes, situations
// described rather than people blamed.

import type { Clause } from '@oe/domain';
import { stamp } from './support';

export const CLAUSES: Clause[] = [
  {
    ...stamp('cls-amendments'),
    key: 'amendments_three_rounds',
    title: 'Three rounds of amendments included',
    category: 'amendments',
    body:
      'Three rounds of amendments are included at no extra charge, provided the ' +
      'requested changes do not substantially alter the scope, nature or purpose ' +
      'of the work, and provided final approval has not yet been given. Further ' +
      'rounds, or changes after final approval, are quoted separately before work ' +
      'continues.',
  },
  {
    ...stamp('cls-working-files'),
    key: 'working_files_release',
    title: 'Release of editable working files',
    category: 'working_files',
    body:
      'Deliverables are supplied in final formats. Editable working files are not ' +
      'included in the fee. Where the client requires them, working files are ' +
      'released at 20% of the cost of the relevant work, on written agreement.',
  },
  {
    ...stamp('cls-look-and-feel'),
    key: 'look_and_feel_scope',
    title: 'Look-and-feel conceptual stage',
    category: 'look_and_feel',
    body:
      'Look-and-feel presentations at the conceptual stage illustrate creative ' +
      'direction only. They are not production-ready artwork, and they do not ' +
      'include final copywriting, photography, licensing or technical build. ' +
      'Development of a selected direction into final deliverables proceeds under ' +
      'the scoped phases of this quotation.',
  },
  {
    ...stamp('cls-sample-application'),
    key: 'sample_application',
    title: 'Sample applications',
    category: 'scope',
    body:
      'Sample applications shown in identity presentations demonstrate how the ' +
      'identity could extend across touchpoints. They are illustrative. Artwork ' +
      'for specific applications is produced only where those applications are ' +
      'listed as deliverables in this quotation.',
  },
  {
    ...stamp('cls-terms-payment'),
    key: 'payment_terms',
    title: 'Payment terms',
    category: 'terms',
    body:
      'Invoices are payable within the number of days stated on the quotation. ' +
      'A deposit invoice may be issued on acceptance and is offset against the ' +
      'final invoice. Work may pause where an invoice remains unpaid past its ' +
      'due date, after written notice.',
  },
];
