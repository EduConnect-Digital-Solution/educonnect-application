import apiClient from '../../../../utils/axiosConfig.js';

/**
 * Parent fee access (backend: /api/fees/my/*).
 * The backend stores money in kobo; everything returned here is in naira.
 */
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
