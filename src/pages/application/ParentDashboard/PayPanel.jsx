import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, CreditCard, Landmark, Lock } from 'lucide-react';
import { getMyGateways, startPaystackPayment, startBankTransfer, verifyPayment } from './services/parentFeeAPIs.js';

const money = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

const GATEWAY_ICON = { paystack: CreditCard, nexapay: Landmark };

const fmtExpiry = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(d) ? d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null;
};

/**
 * "Pay now" panel for one invoice. Offers whichever gateways the school has set up
 * (Paystack redirect, bank transfer), lets the parent pay in full or in part, and
 * calls onPaid() once a payment is confirmed so the page can refresh.
 */
export default function PayPanel({ fee, onPaid }) {
    const outstanding = Number(fee.amountDue ?? 0);

    const [gateways, setGateways] = useState(null); // null = loading
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState(null);
    const [amount, setAmount] = useState(String(outstanding));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [transfer, setTransfer] = useState(null); // bank transfer details once started
    const [result, setResult] = useState(null);     // { tone, text } after checking a transfer
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let alive = true;
        getMyGateways()
            .then((g) => { if (alive) { setGateways(g); setSelected(g[0]?.id ?? null); } })
            .catch((e) => { if (alive) { setGateways([]); setLoadError(e.message); } });
        return () => { alive = false; };
    }, []);

    const parsed = Number(amount);
    const amountOk = Number.isFinite(parsed) && parsed >= 1 && parsed <= outstanding; // at least ₦1, never more than is owed

    const pay = async () => {
        if (!amountOk || !selected) return;
        setBusy(true); setError(''); setResult(null);
        try {
            if (selected === 'paystack') {
                const res = await startPaystackPayment(fee.id, parsed);
                if (!res?.authorizationUrl || !String(res.authorizationUrl).startsWith('https://')) {
                    throw new Error('Could not start the payment. Please try again.');
                }
                window.location.assign(res.authorizationUrl);
                return; // leaving the page; keep the button disabled
            }
            setTransfer(await startBankTransfer(fee.id, parsed));
        } catch (e) {
            setError(e.message);
        }
        setBusy(false);
    };

    const checkTransfer = async () => {
        setBusy(true); setResult(null);
        try {
            const res = await verifyPayment('nexapay', transfer.reference);
            if (res?.status === 'confirmed') {
                setResult({ tone: 'success', text: 'Payment received. Thank you!' });
                onPaid?.();
            } else if (res?.status === 'pending') {
                setResult({ tone: 'info', text: "We haven't received your transfer yet. Bank transfers can take a few minutes, so please check again shortly." });
            } else {
                setResult({ tone: 'warning', text: 'We could not confirm this payment automatically. If you have been debited, please contact the school office with your reference.' });
            }
        } catch (e) {
            setResult({ tone: 'warning', text: e.message });
        }
        setBusy(false);
    };

    const copyAccount = async () => {
        try {
            await navigator.clipboard.writeText(transfer.accountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard unavailable: the number is shown on screen */ }
    };

    const toneClass = { success: 'bg-green-50 text-green-800 border-green-200', info: 'bg-blue-50 text-blue-800 border-blue-200', warning: 'bg-amber-50 text-amber-800 border-amber-200' };

    /* ---- bank transfer details ---- */
    if (transfer) {
        return (
            <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-md mb-6">
                <div>
                    <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Transfer exactly</span>
                    <div className="font-semibold text-[34px] leading-tight text-gray-900">{money(transfer.amount)}</div>
                    <span className="text-sm text-gray-500">for {fee.feeStructureName}</span>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
                    <div>
                        <div className="text-xs text-gray-500">Bank</div>
                        <div className="font-semibold text-gray-900">{transfer.bankName || 'See your banking app'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Account number</div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-2xl tracking-wider text-gray-900">{transfer.accountNumber}</span>
                            <button type="button" onClick={copyAccount} aria-label="Copy account number"
                                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50">
                                {copied ? <><Check size={14} className="text-green-600" /> Copied</> : <><Copy size={14} /> Copy</>}
                            </button>
                        </div>
                    </div>
                    {fmtExpiry(transfer.expiresAt) && (
                        <div className="text-xs text-gray-500">This account is valid until {fmtExpiry(transfer.expiresAt)}.</div>
                    )}
                </div>

                {result && <div className={`text-sm rounded-lg border p-3 leading-relaxed ${toneClass[result.tone]}`} role="status">{result.text}</div>}

                {result?.tone !== 'success' && (
                    <button type="button" disabled={busy} onClick={checkTransfer}
                        className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold">
                        {busy ? 'Checking…' : "I've made the transfer"}
                    </button>
                )}
                {result?.tone !== 'success' && (
                    <button type="button" onClick={() => { setTransfer(null); setResult(null); }} className="text-sm text-gray-500 hover:text-gray-800">
                        Change payment method or amount
                    </button>
                )}
            </div>
        );
    }

    /* ---- choose method and amount ---- */
    return (
        <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-md mb-6">
            <div className="flex flex-col gap-1 pb-4 border-b border-gray-200">
                <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Total amount due</span>
                <span className="font-semibold text-[38px] leading-tight">{money(outstanding)}</span>
                <span className="text-sm text-gray-500 mt-1">for {fee.feeStructureName}</span>
            </div>

            {gateways === null && <p className="text-sm text-gray-500">Loading payment options…</p>}

            {gateways !== null && gateways.length === 0 && (
                <div className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-3 leading-relaxed">
                    {loadError || 'Online payment is not available yet. Please pay at the school office or contact the school.'}
                </div>
            )}

            {gateways?.length > 0 && (
                <>
                    <div className="flex flex-col gap-2.5">
                        <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Choose a payment method</span>
                        {gateways.map((g) => {
                            const Icon = GATEWAY_ICON[g.id] || CreditCard;
                            const active = selected === g.id;
                            return (
                                <button key={g.id} type="button" onClick={() => setSelected(g.id)} aria-pressed={active}
                                    className={`flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-lg transition-all ${active ? 'bg-blue-50 border-[1.5px] border-blue-600 ring-2 ring-blue-500/35' : 'bg-white border-[1.5px] border-gray-200 hover:border-gray-300'}`}>
                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex-none"><Icon size={18} /></span>
                                    <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <span className="font-semibold text-[15px] text-gray-900">{g.name}</span>
                                        <span className="text-xs text-gray-500">{g.description}</span>
                                    </span>
                                    <span className={`w-4 h-4 rounded-full flex-none border-2 ${active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`} />
                                </button>
                            );
                        })}
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="font-medium text-[11px] tracking-wider uppercase text-gray-500">Amount to pay (₦)</span>
                        <input type="number" inputMode="decimal" min="0" max={outstanding} step="0.01" value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11 px-3 rounded-lg border border-gray-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {!amountOk && amount !== '' && <span className="text-xs text-red-600">Enter an amount between ₦1 and {money(outstanding)}.</span>}
                        {amountOk && parsed < outstanding && <span className="text-xs text-gray-500">Part payment: {money(outstanding - parsed)} will remain due.</span>}
                    </label>

                    {error && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-3" role="alert">{error}</div>}

                    <button type="button" disabled={!amountOk || busy} onClick={pay}
                        className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold">
                        {busy ? 'Please wait…' : <>Pay {amountOk ? money(parsed) : ''} now <ArrowRight size={18} /></>}
                    </button>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Lock size={13} className="text-green-500" /> Payments are processed securely by the gateway
                    </div>
                </>
            )}
        </div>
    );
}
