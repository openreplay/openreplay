/* The mock report the deck renders — one designed example ("Checkout &
   billing — July") every ready audit opens in the demo. Content rules the
   template enforces on the model (Mehdi 07-01: "a consistent shell so the
   LLM output follows the same format every time"):
   · every finding carries EVIDENCE — the behavioral micro-narrative the
     agent reads from sessions (the voice Mehdi liked on 06-05: "opened the
     slide-out twice, hovered the warnings, dismissed without proceeding");
   · every finding carries severity, reach (sessions / % of sample), a
     recommendation, and links back into the product (example sessions,
     the detected Issue it corresponds to);
   · positives are mandatory — what to protect, not only what to fix;
   · scores are plain-language dimensions; the Nielsen mapping lives in the
     method appendix. */

export interface ReportDimension {
  name: string;
  score: number; // 0–100
  note: string;
  /** appendix mapping */
  heuristics: string;
}

export interface ReportFinding {
  id: number;
  severity: 'P0' | 'P1' | 'P2';
  title: string;
  where: string;
  /** the behavioral evidence — narrated from real session patterns */
  evidence: string;
  sessions: number;
  pctOfSample: number;
  /** same tag vocabulary the Issues agent uses on its rows */
  tags: string[];
  recommendation: string;
  /** detected Issue this corresponds to (reference-only — the audit never
      creates issues; Issues detects continuously, the audit synthesizes) */
  relatedIssueId?: number;
  relatedIssueName?: string;
}

export const REPORT = {
  title: 'Checkout & billing',
  subtitle: 'UX audit · July 2026',
  scope: ['Segment: Billing & checkout', 'Last 30 days'],
  matched: 8140,
  sampleSize: 2000,
  generatedAt: 'Jul 7, 2026',
  healthScore: 67,
  verdict:
    'The checkout is structurally sound. Users reach payment without hesitation, and the order summary keeps them oriented at every step. The lost ground is concentrated in one place: payment. A silent card-decline failure and a cluster of form-validation friction account for most of the gap, and both are cheap to fix relative to the sessions they cost. Fix the two payment findings first; they sit exactly where users currently give up.',

  dimensions: [
    {
      name: 'Feedback & status',
      score: 41,
      note: 'Payment actions routinely complete or fail with no visible response.',
      heuristics: 'H1 Visibility of system status',
    },
    {
      name: 'Error recovery',
      score: 48,
      note: 'Validation errors appear far from their fields and offer no fix.',
      heuristics: 'H5 Error prevention · H9 Error recovery',
    },
    {
      name: 'Clarity',
      score: 78,
      note: 'Labels and steps read in the user’s language; totals are explicit.',
      heuristics: 'H2 Real-world match · H6 Recognition',
    },
    {
      name: 'Consistency',
      score: 82,
      note: 'Buttons, chips and steps behave the same across the flow.',
      heuristics: 'H4 Consistency and standards',
    },
    {
      name: 'Efficiency',
      score: 66,
      note: 'Guest checkout exists but few users find it; two steps could be skipped.',
      heuristics: 'H7 Flexibility and efficiency',
    },
    {
      name: 'Trust',
      score: 71,
      note: 'Pricing is transparent; slow payment confirmation erodes confidence.',
      heuristics: 'H8 Minimalist design · anti-pattern scan (clean)',
    },
  ] as ReportDimension[],

  findings: [
    {
      id: 1,
      severity: 'P0',
      title: 'Cards decline silently at the payment step',
      where: 'Checkout → Payment',
      evidence:
        'Users fill the card form and press "Place order". When the charge is declined, the button re-enables with no message. 7 in 10 affected users pressed it again within seconds, some up to five times, then scrolled the page looking for a response before leaving. The decline reason exists in the network response. It never reaches the screen.',
      sessions: 214,
      pctOfSample: 11,
      tags: ['Payment', 'Frustration'],
      recommendation:
        'Show the decline reason inline at the card form, keep the entered data, and offer a retry path such as "try another card". The fix is presentation only: the reason is already in the response.',
      relatedIssueId: 1,
      relatedIssueName: 'Card declined with no error message at checkout',
    },
    {
      id: 2,
      severity: 'P1',
      title: 'Valid expiry dates rejected by the card form',
      where: 'Checkout → Payment → Card details',
      evidence:
        'Users typing a valid expiry (MM/YY) get "invalid date" on blur. The typical loop: re-read the field, retype the same value, try with a space, then with a slash. Users averaged 3.4 attempts before guessing the accepted format or abandoning. Hesitation on this single field averages 41 seconds, against 6 for the cardholder-name field beside it.',
      sessions: 96,
      pctOfSample: 5,
      tags: ['Payment', 'Hesitation'],
      recommendation:
        'Accept all common expiry formats and auto-format as the user types; show the expected format in the placeholder, not in the error.',
      relatedIssueId: 3,
      relatedIssueName: 'Card form rejects a valid expiry date',
    },
  ] as ReportFinding[],

  /** exec-summary shortlist — the two spreads above + the next one down */
  topFindings: [
    { severity: 'P0', title: 'Cards decline silently at the payment step' },
    { severity: 'P1', title: 'Valid expiry dates rejected by the card form' },
    { severity: 'P1', title: 'Checkout page takes ~8s to load on first visit' },
  ],

  positives: [
    {
      title: 'The order summary never leaves the screen',
      note: 'Users glance at it before every step transition; it is doing the orientation work. Protect it in any redesign.',
    },
    {
      title: 'One vocabulary across the flow',
      note: '"Place order" means the same thing everywhere it appears; no synonym drift between cart, checkout and confirmation.',
    },
    {
      title: 'The empty-cart state teaches',
      note: 'It routes users to the catalog instead of dead-ending. Nine in ten sessions that hit it kept shopping.',
    },
  ],

  /** opportunity sizing for the roadmap slide — the consulting "so what" */
  sizing:
    '310 of the 2,000 sampled sessions hit an avoidable payment failure. At full traffic that is roughly 1,260 recoverable sessions per month.',

  /** the journey exhibit — where sampled sessions drop, payment highlighted */
  funnel: {
    steps: [
      { label: 'Cart', sessions: 2000 },
      { label: 'Address', sessions: 1680 },
      { label: 'Payment', sessions: 1560 },
      { label: 'Order placed', sessions: 1090 },
    ],
    highlightStep: 3,
    highlightNote:
      'Two thirds of the payment drop (310 of 470 sessions) traces to findings 1 and 2.',
    description:
      'Sessions move cleanly through cart and address. Both steps lose less than a fifth of their traffic, which is within the normal range for guest checkouts. The cliff is at payment: 470 of the 1,560 sessions that reached the payment page never placed an order. The evidence on the next two slides accounts for two thirds of that loss. Recover those sessions and the funnel converts at roughly 70% instead of 55%.',
  },

  roadmap: [
    { severity: 'P0', item: 'Inline decline reason + retry at payment', effort: 'S' },
    { severity: 'P1', item: 'Expiry field: accept & auto-format all common formats', effort: 'S' },
    { severity: 'P1', item: 'First-load performance on /checkout (~8s → <2s)', effort: 'M' },
    { severity: 'P2', item: 'Surface guest checkout earlier in the flow', effort: 'S' },
    { severity: 'P2', item: 'Move validation errors next to their fields', effort: 'M' },
  ],

  method: {
    sample:
      '2,000 sessions sampled from 8,140 matching the scope (Segment: Billing & checkout, Jun 7 – Jul 7 2026), desktop and mobile web.',
    how: 'The agent read each session for behavioral signals: hesitation, repeated actions, dead clicks, abandoned steps. Findings were clustered, scored, and checked against the full sample.',
    scoring:
      'Dimension scores are 0–100 composites mapped from Nielsen’s usability heuristics (see each dimension). Severity: Critical blocks task completion, Major causes significant friction, Minor is recoverable with effort.',
    limits:
      'Sessions outside the segment, logged-out bounce traffic and the admin surface were not assessed.',
  },
};
