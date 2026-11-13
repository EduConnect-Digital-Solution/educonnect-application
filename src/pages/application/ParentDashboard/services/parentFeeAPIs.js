import apiClient from '../../../../utils/axiosConfig.js';

/**
 * Parent fee access (backend: /api/fees/my/*).
 * The backend stores money in kobo; everything returned here is in naira.
 */
export const pendingPaymentKey = user => {
    const identity = user?.id ?? user?.userId ?? user?.email;
    return identity ? `ec_pending_paystack_ref:${identity}:${user?.schoolId ?? ''}` : null;
};

export const readPendingPayments = key => {
    if (!key) return [];
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(item => item?.reference) : []; }
        catch { return [{ reference: raw }]; }
    } catch { return []; }
};
export const writePendingPayments = (key, payments) => {
    if (!key) return;
    try { if (payments.length) localStorage.setItem(key, JSON.stringify(payments)); else localStorage.removeItem(key); } catch { /* storage unavailable */ }
};

const KOBO = 100;
const toNaira = (kobo) => Number(kobo || 0) / KOBO;

const unwrapError = (err, fallback) => {
    const data = err?.response?.data;
    return new Error(data?.message || fallback);
};

/** All non-void invoices for the signed-in parent's children, each with its confirmed payments. */
export async function getMyInvoices() {
    try {
        const { data } = await apiClient.get('/api/fees/my/invoices');
        return (data?.data?.invoices ?? [])
            .filter((invoice) => invoice.status !== 'void')
            .map((invoice) => ({
                ...invoice,
                amount: toNaira(invoice.amount),
                amountPaid: toNaira(invoice.amountPaid),
                amountDue: toNaira(invoice.amountDue),
                payments: (invoice.payments ?? []).map((p) => ({ ...p, amount: toNaira(p.amount) })),
            }));
    } catch (err) {
        throw unwrapError(err, 'Could not load fees. Please try again.');
    }
}

/** Receipt for one of the parent's own confirmed payments (amounts in naira). */
export async function getMyReceipt(paymentId) {
    try {
        const { data } = await apiClient.get(`/api/fees/my/receipts/${paymentId}`);
        const receipt = data?.data?.receipt;
        if (!receipt) throw new Error('Receipt not available.');
        return { ...receipt, amountPaid: toNaira(receipt.amountPaid), balance: toNaira(receipt.balance) };
    } catch (err) {
        if (err instanceof Error && !err.response) throw err;
        throw unwrapError(err, 'Could not load the receipt. Please try again.');
    }
}

/* ─── Paying (backend: /api/fees/my/*) ───────────────────────────────────────
 * Amounts sent to the backend are in kobo; the UI works in naira.
 */
const toKobo = (naira) => Math.round(Number(naira) * KOBO);

/** Gateways the school can accept right now: [{ id, name, description, flow }] */
export async function getMyGateways() {
    try {
        const { data } = await apiClient.get('/api/fees/my/gateways');
        return data?.data?.gateways ?? [];
    } catch (err) {
        throw unwrapError(err, 'Could not load payment options.');
    }
}

/** Paystack: returns { authorizationUrl, reference } to redirect the parent to. */
export async function startPaystackPayment(invoiceId, amountNaira) {
    try {
        const { data } = await apiClient.post(`/api/fees/my/invoices/${invoiceId}/paystack`, { amount: toKobo(amountNaira) });
        return data?.data;
    } catch (err) {
        throw unwrapError(err, 'Could not start the payment. Please try again.');
    }
}

/** Bank transfer: returns { reference, accountNumber, bankName, amount (naira), expiresAt }. */
export async function startBankTransfer(invoiceId, amountNaira) {
    try {
        const { data } = await apiClient.post(`/api/fees/my/invoices/${invoiceId}/nexapay`, { amount: toKobo(amountNaira) });
        const d = data?.data;
        return { ...d, amount: toNaira(d?.amount) };
    } catch (err) {
        throw unwrapError(err, 'Could not set up the bank transfer. Please try again.');
    }
}

/** Returns { status: 'confirmed' | 'pending' | 'failed' | 'review', ... }. */
export async function verifyPayment(gateway, reference) {
    const url = gateway === 'paystack' ? '/api/fees/my/payments/paystack/verify' : '/api/fees/my/payments/nexapay/verify';
    try {
        const { data } = await apiClient.post(url, { reference });
        return data?.data;
    } catch (err) {
        throw unwrapError(err, 'Could not check the payment. Please try again.');
    }
}

