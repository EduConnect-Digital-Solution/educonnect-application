import apiClient from '../../../../utils/axiosConfig.js';

/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  FEE & PAYMENT MANAGEMENT ENGINE  —  API SPECIFICATION & STUB LAYER
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  Base routes derive from newFeatures.md §Fees and are EXTENDED into a robust,
 *  production-grade, ledger-based finance module per feeImplementation.md.
 *
 *  ┌─ DESIGN PRINCIPLES (feeImplementation.md) ───────────────────────────────┐
 *  │  • Ledger-based      — every action is a transaction (debit/credit/adj)  │
 *  │  • Double-entry      — Student Receivable ↔ School Revenue               │
 *  │  • Event-driven      — emits FEE_STRUCTURE_PUBLISHED, BILL_GENERATED,    │
 *  │                        PAYMENT_INITIATED, PAYMENT_CONFIRMED,             │
 *  │                        PAYMENT_FAILED                                    │
 *  │  • Modular layers    — Config · Billing · Payment · Ledger ·             │
 *  │                        Reconciliation · Reporting                       │
 *  │  • 2-phase lifecycle — draft → published (no intermediate review or      │
 *  │                        locked states; publish is visible to parents      │
 *  │                        and students immediately)                         │
 *  └────────────────────────────┘
 *
 *  MONEY: all amounts are stored & transmitted in KOBO (integer). Never floats.
 *         Use formatNaira(kobo) for display only.
 *
 *  FEATURE FLAG: flip FEE_BACKEND_LIVE = true once endpoints are deployed.
 *  Every stub logs its exact METHOD + URL + PAYLOAD + expected RESPONSE so the
 *  backend developer has a precise contract to implement against.
 *
 *  ID NORMALISATION: live backend returns Mongo `_id`; normalizeId() maps it to
 *  `id` so the frontend state shape stays consistent.
 */

export const FEE_BACKEND_LIVE = true;

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

// ── ID normalisation (live-mode only) ────
const normalizeId = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const { _id, ...rest } = obj;
  return _id ? { id: _id, _id, ...rest } : obj;
};
const normalizeList = (list) =>
  Array.isArray(list) ? list.map(normalizeId) : list;

// ═════════════════════════════════════════════════════════════════════════════
//  DOMAIN CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

/** Standard Nigerian school fee item types. */
export const FEE_TYPES = [
  { id: 'tuition',      label: 'Tuition',          optional: false },
  { id: 'development',  label: 'Development Levy',  optional: false },
  { id: 'transport',   label: 'Transport',         optional: true  },
  { id: 'boarding',    label: 'Boarding',          optional: true  },
  { id: 'uniform',     label: 'Uniform',           optional: true  },
  { id: 'books',       label: 'Books / Materials', optional: true  },
  { id: 'exam',        label: 'Examination',       optional: false },
  { id: 'pta',         label: 'PTA Levy',          optional: false },
  { id: 'miscellaneous', label: 'Miscellaneous',   optional: true  },
];

/**
 * Fee structure lifecycle — 2 phases only: draft → published.
 *
 * • draft     — created, editable, not visible to parents/students.
 * • published — visible on parent and student dashboards; no further edits allowed.
 *
 * A published structure can be reverted to draft by an admin if corrections are needed
 * (revert_draft action on the transition endpoint), but this is not surfaced in the UI
 * to prevent accidental changes after parents have seen the fee structure.
 */
export const STRUCTURE_STATUS = {
  draft:     { label: 'Draft',     style: 'bg-gray-100 text-gray-600 border border-gray-200',     next: 'published' },
  published: { label: 'Published', style: 'bg-green-50 text-green-700 border border-green-200',    next: null        },
};

/** Invoice (bill) lifecycle. */
export const INVOICE_STATUS = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  partial:  'bg-blue-50 text-blue-700 border border-blue-200',
  paid:     'bg-green-50 text-green-700 border border-green-200',
  overdue:  'bg-red-50 text-red-700 border border-red-200',
  void:     'bg-gray-100 text-gray-500 border border-gray-200',
};

/** Manual + gateway payment channels. */
export const PAYMENT_METHODS = [
  { id: 'cash',          label: 'Cash',           kind: 'manual'  },
  { id: 'bank_transfer', label: 'Bank Transfer',  kind: 'manual'  },
  { id: 'pos',           label: 'POS',            kind: 'manual'  },
  { id: 'cheque',        label: 'Cheque',         kind: 'manual'  },
  { id: 'paystack',      label: 'Paystack',       kind: 'gateway' },
  { id: 'flutterwave',   label: 'Flutterwave',    kind: 'gateway' },
];

/** Ledger entry kinds (double-entry). */
export const LEDGER_ENTRY_TYPES = {
  debit:      'Debit (Bill)',
  credit:     'Credit (Payment)',
  adjustment: 'Adjustment',
};

/** Adjustment categories. */
export const ADJUSTMENT_TYPES = [
  { id: 'discount',    label: 'Discount'    },
  { id: 'waiver',      label: 'Waiver'      },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'correction',  label: 'Correction'  },
];

/** Domain events emitted by the backend (documented for the integrator). */
export const FEE_EVENTS = [
  'FEE_STRUCTURE_PUBLISHED',
  'BILL_GENERATED',
  'PAYMENT_INITIATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_FAILED',
  'ADJUSTMENT_APPLIED',
  'INVOICE_VOIDED',
];

// ═════════════════════════════════════════════════════════════════════════════
//  MONEY HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** Format kobo (integer) → ₦ display string. */
export function formatNaira(kobo = 0) {
  const naira = (Number(kobo) || 0) / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(naira);
}

/** Convert a Naira input (number/string)GO  → kobo integer for transmission. */
export function toKobo(naira) {
  return Math.round((Number(naira) || 0) * 100);
}

/** Sum a fee structure's items → total kobo. */
export function sumItems(items = []) {
  return items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
}

// ── Mock id helper ──────────────
let _seq = 0;
const mockId = (prefix) => `${prefix}_${Date.now().toString(36)}_${_seq++}`;

// ═════════════════════════════════════════════════════════════════════════════
//  A. FEE CONFIGURATION LAYER
//     POST/GET/PUT/DELETE /api/fees/structures (+ clone, transition, versions)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/structures
 * Query: ?academicYearId=&termId=&classId=&status=
 */
export async function getFeeStructures(filters = {}) {
  const { data } = await apiClient.get('/api/fees/structures', { params: filters });
  if (data.success) data.data.feeStructures = normalizeList(data.data.feeStructures);
  return data;
}

/**
 * GET /api/fees/structures/:id
 */
export async function getFeeStructureById(structureId) {
  try {
    const { data } = await apiClient.get(`/api/fees/structures/${structureId}`);
    if (data.success && data.data) {
      const fs = data.data.feeStructure || data.data;
      data.data.feeStructure = normalizeId(fs);
    }
    return data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}

/**
 * POST /api/fees/structures
 * Creates a DRAFT fee structure (multi-item, optional installment plans).
 *
 * Payload:
 * {
 *   academicYearId, termId, classId, className,
 *   name: "JSS1 First Term Fees",
 *   items: [{ feeType, name, amount(kobo), optional, conditional? }],
 *   dueDate: "2026-01-15",
 *   paymentType: "one-time | installment",
 *   installmentPlans?: [{ label, percentage, dueDate }]
 * }
 * Response (201): { success, message, data: { feeStructure } }
 */
export async function createFeeStructure(payload) {
  const { data } = await apiClient.post('/api/fees/structures', payload);
  if (data.success) data.data.feeStructure = normalizeId(data.data.feeStructure);
  return data;
}

/**
 * PUT /api/fees/structures/:id
 * Editable only while status = 'draft'. Attempting to edit a published structure
 * should be rejected by the backend with a 409 Conflict response.
 * Each successful edit increments `version` (version control).
 *
 * Backend rule: reject (409) if status is 'published'.
 */
export async function updateFeeStructure(structureId, payload) {
  const { data } = await apiClient.put(`/api/fees/structures/${structureId}`, payload);
  if (data.success) data.data.feeStructure = normalizeId(data.data.feeStructure);
  return data;
}

/**
 * DELETE /api/fees/structures/:id
 * Backend rule: only DRAFT structures are deletable; published with invoices → 409.
 */
export async function deleteFeeStructure(structureId) {
  try {
    const { data } = await apiClient.delete(`/api/fees/structures/${structureId}`);
    return data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}

/**
 * POST /api/fees/structures/:id/clone
 * Clones a structure into a new term/year (Advanced Capability: "Clone previous term fees").
 * Payload: { targetAcademicYearId, targetTermId, targetClassIds?: [] }
 * Response: { success, data: { feeStructures: [...] } }  // one per target class
 */
export async function cloneFeeStructure(structureId, payload) {
  try {
    const { data } = await apiClient.post(`/api/fees/structures/${structureId}/clone`, payload);
    if (data.success) data.data.feeStructures = normalizeList(data.data.feeStructures);
    return data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}

/**
 * POST /api/fees/structures/:id/transition
 * Drives the 2-phase lifecycle: draft → published.
 *
 * Supported actions:
 * • 'publish'       — moves draft → published. Backend MUST:
 *                     1. Emit FEE_STRUCTURE_PUBLISHED.
 *                     2. Prevent further structural edits.
 *                     3. Optionally auto-generate invoices server-side via the
 *                        FEE_STRUCTURE_PUBLISHED event handler (the frontend
 *                        also calls generateInvoicesForClass immediately after
 *                        this endpoint returns, so idempotency is essential).
 *                     Parents and students see the fee structure on their
 *                     dashboards as soon as this transitions to 'published'.
 * • 'revert_draft'  — emergency revert published → draft (admin-only; use with
 *                     care; not exposed in the UI to avoid confusion after
 *                     parents have already seen it).
 *
 * Payload: { action: 'publish' | 'revert_draft' }
 * Response: { success, message, data: { feeStructure: { id, status } } }
 */
export async function transitionFeeStructure(structureId, action) {
  try {
    const { data } = await apiClient.post(`/api/fees/structures/${structureId}/transition`, { action });
    if (data.success && data.data?.feeStructure) data.data.feeStructure = normalizeId(data.data.feeStructure);
    return data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}

/**
 * GET /api/fees/structures/:id/versions
 * Returns the immutable change-history (version control / audit trail).
 */
export async function getFeeStructureVersions(structureId) {
  const { data } = await apiClient.get(`/api/fees/structures/${structureId}/versions`);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  B. BILLING LAYER  —  INVOICES (bills)
//     /api/fees/invoices  (+ generate, void, student fees)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/invoices
 * Query: ?classId=&status=&studentId=&academicYearId=&termId=&search=&page=&limit=
 * Response includes a roll-up `summary` for the toolbar KPIs.
 */
export async function getInvoices(filters = {}) {
  const { data } = await apiClient.get('/api/fees/invoices', { params: filters });
  if (data.success) data.data.invoices = normalizeList(data.data.invoices);
  return data;
}

/**
 * POST /api/fees/invoices
 * Unified bulk creation (newFeatures.md base).
 * Payload: { invoices: [{ feeStructureId, studentId }] }
 * Emits BILL_GENERATED per invoice. Creates a DEBIT ledger entry per invoice.
 */
export async function createInvoices(payload) {
  const { data } = await apiClient.post('/api/fees/invoices', payload);
  if (data.success) data.data.invoices = normalizeList(data.data.invoices);
  return data;
}

/**
 * POST /api/fees/invoices/generate
 * Bulk invoice generation for an entire class from a published fee structure.
 * Backend resolves the student roster server-side — no need to send individual IDs.
 *
 * This is called AUTOMATICALLY by the frontend immediately after a fee structure
 * is published (see FeeStructuresTab → handleConfirmPublish). It is also safe to
 * call from the FEE_STRUCTURE_PUBLISHED backend event handler for server-side
 * generation. The endpoint MUST be idempotent — students already billed should
 * be skipped rather than double-billed.
 *
 * Payload: { feeStructureId, classId, armId?, includeOptional?: string[] }
 * Response: { success, message, data: { generated, skipped, invoices:[] } }
 */
export async function generateInvoicesForClass(payload) {
  const { data } = await apiClient.post('/api/fees/invoices/generate', payload);
  if (data.success) data.data.invoices = normalizeList(data.data.invoices);
  return data;
}

/**
 * GET /api/fees/invoices/:id
 */
export async function getInvoiceById(invoiceId) {
  const { data } = await apiClient.get(`/api/fees/invoices/${invoiceId}`);
  if (data.success) data.data = normalizeId(data.data.invoice || data.data);
  return data;
}

/**
 * POST /api/fees/invoices/:id/void
 * Soft-cancels an invoice. Posts a reversing ledger entry (never hard-delete).
 * Payload: { reason }
 */
export async function voidInvoice(invoiceId, reason) {
  const { data } = await apiClient.post(`/api/fees/invoices/${invoiceId}/void`, { reason });
  return data;
}

/**
 * GET /api/fees/student/:studentId   (newFeatures.md base)
 * Full fee position for one student (all invoices + computed balance).
 */
export async function getStudentFees(studentId) {
  const { data } = await apiClient.get(`/api/fees/student/${studentId}`);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  C. PAYMENT LAYER  —  manual record + gateway init/verify
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/fees/invoices/:invoiceId/payment   (newFeatures.md base)
 * MANUAL payment recording (cash / bank_transfer / pos / cheque).
 * Posts a CREDIT ledger entry, recomputes invoice status (partial vs paid),
 * emits PAYMENT_CONFIRMED, returns a receipt stub.
 *
 * Payload: { amount(kobo), paymentMethod, referenceNumber, receiptNumber?, note?, paidAt? }
 */
export async function recordPayment(invoiceId, payload) {
  const { data } = await apiClient.post(`/api/fees/invoices/${invoiceId}/payments`, payload);
  return data;
}

/**
 * POST /api/fees/invoices/:invoiceId/initialize   (GATEWAY)
 * Starts an online payment with Paystack / Flutterwave.
 * Emits PAYMENT_INITIATED. Returns a hosted checkout URL + reference.
 *
 * Payload: { gateway: 'paystack' | 'flutterwave', amount(kobo), email, callbackUrl }
 * Response: { success, data: { authorizationUrl, reference, accessCode } }
 */
export async function initializePayment(invoiceId, payload) {
  try {
    const { data } = await apiClient.post(
      `/api/fees/invoices/${invoiceId}/initialize`, payload
    );
    return data;
  } catch (err) {
    if (err?.response?.status === 404) {
      const { data } = await apiClient.post(
        `/api/fees/invoices/${invoiceId}/payment/initialize`, payload
      );
      return data;
    }
    throw err;
  }
}

/**
 * POST /api/fees/payments/verify   (GATEWAY CALLBACK)
 * Verifies a gateway transaction by reference (server-to-server confirm).
 * On success → posts CREDIT ledger entry, emits PAYMENT_CONFIRMED.
 * On failure → emits PAYMENT_FAILED.
 *
 * Payload: { reference, gateway }
 */
export async function verifyPayment(payload) {
  const { data } = await apiClient.post('/api/fees/payments/verify', payload);
  return data;
}

/**
 * GET /api/fees/invoices/:invoiceId/payments   (newFeatures.md base)
 * Payment history for one invoice.
 */
export async function getPaymentHistory(invoiceId) {
  const { data } = await apiClient.get(`/api/fees/invoices/${invoiceId}/payments`);
  if (data.success) data.data.payments = normalizeList(data.data.payments);
  return data;
}

/**
 * GET /api/fees/payments   (ROBUST EXTENSION)
 * School-wide payment feed for reconciliation / cashbook.
 * Query: ?from=&to=&method=&gateway=&status=&page=&limit=
 */
export async function getAllPayments(filters = {}) {
  const { data } = await apiClient.get('/api/fees/payments', { params: filters });
  if (data.success) data.data.payments = normalizeList(data.data.payments);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  D. ADJUSTMENTS  —  discounts / waivers / scholarships / corrections
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/fees/adjustments
 * Posts an ADJUSTMENT ledger entry against a student/invoice.
 * Payload: { studentId, invoiceId?, type, amount(kobo), reason, approvedBy }
 */
export async function applyAdjustment(payload) {
  const { data } = await apiClient.post('/api/fees/adjustments', payload);
  return data;
}

/**
 * GET /api/fees/adjustments
 * Query: ?studentId=&type=&from=&to=
 */
export async function getAdjustments(filters = {}) {
  const { data } = await apiClient.get('/api/fees/adjustments', { params: filters });
  if (data.success) data.data.adjustments = normalizeList(data.data.adjustments);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  E. LEDGER LAYER  —  double-entry transaction trail
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/ledger/student/:studentId
 * Chronological transaction trail with running balance.
 * Query: ?academicYearId=&termId=
 *
 * Each row: { date, type: debit|credit|adjustment, description, debit, credit,
 *             balance, reference, account }  // account = receivable | revenue
 */
export async function getStudentLedger(studentId, filters = {}) {
  const { data } = await apiClient.get(`/api/fees/ledger/students/${studentId}`, { params: filters });
  return data;
}

/**
 * GET /api/fees/ledger/summary
 * School-level double-entry trial balance roll-up.
 * Query: ?academicYearId=&termId=
 */
export async function getLedgerSummary(filters = {}) {
  const { data } = await apiClient.get('/api/fees/ledger/summary', { params: filters });
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  F. RECEIPTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/receipts/:paymentId
 * Returns a render-ready digital receipt document.
 */
export async function getReceipt(paymentId) {
  const { data } = await apiClient.get(`/api/fees/receipts/${paymentId}`);
  return data;
}

/**
 * POST /api/fees/receipts/:paymentId/send
 * Emails / SMS the receipt to the parent.
 * Payload: { channel: 'email' | 'sms', to }
 */
export async function sendReceipt(paymentId, payload) {
  const { data } = await apiClient.post(`/api/fees/receipts/${paymentId}/send`, payload);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  G. REPORTING LAYER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/analytics   (newFeatures.md base)
 * Query: ?classId=&academicYearId=&termId=
 */
export async function getFeeAnalytics(filters = {}) {
  const { data } = await apiClient.get('/api/fees/reports/analytics', { params: filters });
  return data;
}

/**
 * GET /api/fees/reports/outstanding   (ROBUST EXTENSION)
 * Outstanding balance per student (the poster's "outstanding balances report").
 * Query: ?classId=&armId=&threshold=&academicYearId=&termId=&page=&limit=
 */
export async function getOutstandingBalances(filters = {}) {
  const { data } = await apiClient.get('/api/fees/reports/outstanding', { params: filters });
  return data;
}

/**
 * GET /api/fees/reports/aging   (ROBUST EXTENSION)
 * Aging buckets of arrears (0-30 / 31-60 / 61-90 / 90+ days).
 */
export async function getAgingReport(filters = {}) {
  const { data } = await apiClient.get('/api/fees/reports/aging', { params: filters });
  return data;
}

/**
 * GET /api/fees/reports/collections   (ROBUST EXTENSION)
 * Collection performance over a date range (for charts / export).
 */
export async function getCollectionReport(filters = {}) {
  const { data } = await apiClient.get('/api/fees/reports/collections', { params: filters });
  return data;
}

// ═════════════════════════════════════════════════════════════════════════════
//  H. RECONCILIATION LAYER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/fees/reconciliation
 * Gateway settlement vs recorded payments (flags mismatches).
 * Query: ?gateway=&from=&to=&status=matched|unmatched
 */
export async function getReconciliation(filters = {}) {
  const { data } = await apiClient.get('/api/fees/reconciliation', { params: filters });
  return data;
}

/**
 * POST /api/fees/reconciliation/match
 * Manually links a gateway settlement line to a recorded payment.
 * Payload: { settlementId, paymentId }
 */
export async function reconcileTransaction(payload) {
  const { data } = await apiClient.post('/api/fees/reconciliation/match', payload);
  return data;
}
