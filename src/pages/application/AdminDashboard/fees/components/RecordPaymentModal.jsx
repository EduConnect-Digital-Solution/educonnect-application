import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import {
  recordPayment,
  initializePayment,
  verifyPayment,
  formatNaira,
  toKobo,
  PAYMENT_METHODS,
} from '../../services/feeAPIs.js';
import { X, Loader2, CreditCard, Banknote, ShieldCheck, Mail, ExternalLink, CheckCircle2, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';

/**
 * RecordPaymentModal
 * Handles BOTH manual recording (cash/bank/pos/cheque) and online gateway
 * checkout (Paystack/Flutterwave) with the init → verify round-trip.
 *
 * Supports email selection for admins paying on behalf of a student:
 * - Registered email under the child/parent
 * - Logged-in admin email from AuthContext
 *
 * Props: { invoice, onClose, onRecorded(updatedInvoice, payment), showToast }
 */
export default function RecordPaymentModal({ invoice, onClose, onRecorded, showToast }) {
  const { user } = useAuth();
  const adminEmail = user?.email || user?.userEmail || '';

  const due = invoice.amountDue ?? (invoice.amount - (invoice.amountPaid || 0));

  const initialRegEmail =
    invoice.parentEmail ||
    invoice.studentEmail ||
    invoice.email ||
    invoice.student?.email ||
    invoice.parent?.email ||
    invoice.guardianEmail ||
    invoice.payerEmail ||
    '';

  const [method, setMethod]             = useState('paystack');
  const [amount, setAmount]             = useState(due > 0 ? due / 100 : '');
  const [reference, setReference]       = useState('');
  const [note, setNote]                 = useState('');
  const [busy, setBusy]                 = useState(false);

  // Email choice state: 'registered' or 'admin'
  const [emailMode, setEmailMode]       = useState(initialRegEmail ? 'registered' : (adminEmail ? 'admin' : 'registered'));
  const [registeredEmailInput, setRegisteredEmailInput] = useState(initialRegEmail);

  // Gateway reference & checkout authorization URL
  const [gatewayRef, setGatewayRef]     = useState(null);
  const [authUrl, setAuthUrl]           = useState('');
  const [verifyFailed, setVerifyFailed] = useState(false);

  // Pending exit state for confirmation popup when leaving active Paystack session
  const [pendingExit, setPendingExit]   = useState(null); // null | { type: 'close' } | { type: 'method', targetMethod: string }

  const methodMeta = PAYMENT_METHODS.find(m => m.id === method);
  const isGateway  = methodMeta?.kind === 'gateway';

  const effectiveEmail = emailMode === 'registered' ? registeredEmailInput.trim() : adminEmail.trim();

  // Auto-detect reference from URL query params (trxref or reference) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('trxref') || params.get('reference');
    if (urlRef) {
      setGatewayRef(urlRef);
      setMethod('paystack');
    }
  }, []);

  // Intercept exit triggers (close modal, backdrop click, method switch)
  const attemptClose = () => {
    if (isGateway && gatewayRef) {
      setPendingExit({ type: 'close' });
    } else {
      onClose();
    }
  };

  const attemptChangeMethod = (targetMethodId) => {
    if (targetMethodId === method) return;
    if (isGateway && gatewayRef) {
      setPendingExit({ type: 'method', targetMethod: targetMethodId });
    } else {
      setMethod(targetMethodId);
      setGatewayRef(null);
      setAuthUrl('');
      setVerifyFailed(false);
    }
  };

  const confirmExitAction = () => {
    const action = pendingExit;
    setPendingExit(null);
    setGatewayRef(null);
    setAuthUrl('');
    setVerifyFailed(false);

    if (action?.type === 'close') {
      onClose();
    } else if (action?.type === 'method') {
      setMethod(action.targetMethod);
      showToast('Paystack session cancelled. Switched payment method.', 'info');
    }
  };

  const cancelExitAction = () => {
    setPendingExit(null);
  };

  const handleChangeAmount = () => {
    setGatewayRef(null);
    setAuthUrl('');
    setVerifyFailed(false);
    showToast('Payment reference reset. You can now adjust the amount and generate a new Paystack checkout reference.', 'info');
  };

  const handleManual = async () => {
    if (!amount || Number(amount) <= 0) return showToast('Enter a valid amount', 'error');
    setBusy(true);
    try {
      const res = await recordPayment(invoice.id, {
        amount: toKobo(amount),
        paymentMethod: method,
        referenceNumber: reference || undefined,
        note: note || undefined,
        paidAt: new Date().toISOString(),
      });
      if (res.success) {
        const paid = (invoice.amountPaid || 0) + toKobo(amount);
        const total = invoice.amount || toKobo(amount);
        const status = paid >= total ? 'paid' : 'partial';
        onRecorded(
          { id: invoice.id, amountPaid: paid, amountDue: Math.max(0, total - paid), status },
          res.data.payment
        );
        showToast('Payment recorded successfully');
        onClose();
      }
    } catch (e) {
      showToast(e.message || 'Failed to record payment', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGatewayInit = async () => {
    if (!amount || Number(amount) <= 0) return showToast('Enter a valid amount', 'error');

    if (!effectiveEmail) {
      return showToast('Please provide a valid email address for Paystack checkout', 'error');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(effectiveEmail)) {
      return showToast('Please enter a valid email address', 'error');
    }

    setBusy(true);
    setVerifyFailed(false);
    try {
      const initPayload = {
        gateway: method,
        amount: toKobo(amount),
        email: effectiveEmail,
      };

      // express-validator on backend rejects localhost URLs for callbackUrl.
      // Omit callbackUrl when on localhost so backend defaults to FRONTEND_URL.
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && window.location.protocol === 'https:') {
        initPayload.callbackUrl = window.location.href;
      }

      const res = await initializePayment(invoice.id, initPayload);

      if (res.success && res.data) {
        const ref = res.data.reference;
        const url = res.data.authorizationUrl;

        setGatewayRef(ref);
        setAuthUrl(url);

        if (url) {
          window.open(url, '_blank', 'noopener');
        }

        showToast('Paystack checkout initialized — complete payment in the checkout tab then click Verify');
      } else {
        showToast(res.message || 'Failed to initialize Paystack checkout', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Failed to initialize gateway session', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!gatewayRef) return showToast('No gateway transaction reference found', 'error');
    setBusy(true);
    setVerifyFailed(false);
    try {
      const res = await verifyPayment({ reference: gatewayRef, gateway: method });
      if (res.success && res.data?.status === 'confirmed') {
        const paidAmt = res.data.payment?.amount || toKobo(amount);
        const paid = (invoice.amountPaid || 0) + paidAmt;
        const total = invoice.amount || paidAmt;
        const status = paid >= total ? 'paid' : 'partial';

        onRecorded(
          { id: invoice.id, amountPaid: paid, amountDue: Math.max(0, total - paid), status },
          res.data.payment
        );
        showToast('Paystack payment verified and posted successfully!');
        onClose();
      } else {
        setVerifyFailed(true);
        showToast('Payment not yet confirmed on Paystack. Complete checkout and try again.', 'error');
      }
    } catch (e) {
      setVerifyFailed(true);
      showToast(e.message || 'Verification failed. Please check checkout window and retry.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={attemptClose} />
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
              <p className="text-xs text-gray-500">Record manual receipts or process via Paystack</p>
            </div>
            <button onClick={attemptClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Invoice summary */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-700/70 uppercase">Student</span>
                <span className="font-bold text-gray-900">{invoice.studentName || invoice.studentId}</span>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs font-medium text-gray-500">Invoice Total</span>
                <span className="font-semibold text-gray-800">{formatNaira(invoice.amount)}</span>
              </div>
              <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-blue-100/60">
                <span className="text-xs font-semibold text-gray-700">Outstanding Balance</span>
                <span className="font-bold text-red-600 text-base">{formatNaira(due)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Payment Method *</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => attemptChangeMethod(m.id)}
                    className={`px-2 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      method === m.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {m.kind === 'gateway' ? <CreditCard size={13} /> : <Banknote size={13} />}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-600 uppercase block">Payment Amount (₦) *</label>
                {isGateway && gatewayRef && (
                  <button
                    type="button"
                    onClick={handleChangeAmount}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    Change Amount
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isGateway && !!gatewayRef}
                placeholder="Enter amount"
                className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none ${
                  isGateway && gatewayRef ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {isGateway && gatewayRef
                  ? 'Amount is locked for active Paystack session. Click "Change Amount" to reset and create a new reference.'
                  : 'Partial payments allowed — invoice status will update automatically.'}
              </p>
            </div>

            {/* GATEWAY-SPECIFIC FIELDS: Payer Email selection for Paystack */}
            {isGateway && !gatewayRef && (
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Paystack Payer Email</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">
                      Select which email address Paystack will use to process payment & send receipts:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Option 1: Registered Email */}
                  <div
                    onClick={() => setEmailMode('registered')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      emailMode === 'registered'
                        ? 'bg-white border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-gray-100/60 border-transparent hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailMode"
                      id="emailMode-registered"
                      checked={emailMode === 'registered'}
                      onChange={() => setEmailMode('registered')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="emailMode-registered" className="font-semibold text-gray-800 block cursor-pointer">
                        Child / Parent Registered Email
                      </label>
                      {initialRegEmail ? (
                        <p className="text-[11px] text-gray-600 font-medium mt-0.5">{initialRegEmail}</p>
                      ) : (
                        <div className="mt-1">
                          <input
                            type="email"
                            value={registeredEmailInput}
                            onChange={e => {
                              setRegisteredEmailInput(e.target.value);
                              setEmailMode('registered');
                            }}
                            placeholder="Enter child/parent email"
                            className="w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Option 2: Admin Email (Logged in user) */}
                  <div
                    onClick={() => setEmailMode('admin')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      emailMode === 'admin'
                        ? 'bg-white border-blue-500 ring-1 ring-blue-500/20 shadow-xs'
                        : 'bg-gray-100/60 border-transparent hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailMode"
                      id="emailMode-admin"
                      checked={emailMode === 'admin'}
                      onChange={() => setEmailMode('admin')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="emailMode-admin" className="font-semibold text-gray-800 block cursor-pointer">
                        Logged-in Admin Email
                      </label>
                      <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                        {adminEmail || '(Logged in user email)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MANUAL-ONLY FIELDS */}
            {!isGateway && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">
                    Reference / Teller No.
                  </label>
                  <input
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="e.g. TXN-009912 or Teller #10293"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Note (optional)</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Payment notes or memo"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </>
            )}

            {/* GATEWAY ACTIVE CHECKOUT STATE */}
            {isGateway && gatewayRef && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Paystack Session Initialized</h4>
                      <p className="text-[11px] text-emerald-700 font-mono">Ref: {gatewayRef}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  Complete checkout in Paystack window. Once payment is finished, click <strong>Verify Payment</strong> below.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                  {authUrl && (
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 underline"
                    >
                      <ExternalLink size={13} />
                      Re-open Paystack Checkout Window
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleChangeAmount}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <RotateCcw size={13} className="text-blue-600" />
                    Change Amount
                  </button>
                </div>

                {verifyFailed && (
                  <div className="flex items-center gap-2 bg-amber-100/80 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-900">
                    <AlertCircle size={15} className="shrink-0 text-amber-700" />
                    <span>Payment not yet verified on Paystack. Complete checkout and try clicking Verify again.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={attemptClose}
              disabled={busy}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            {!isGateway ? (
              <button
                onClick={handleManual}
                disabled={busy}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                Record Payment
              </button>
            ) : !gatewayRef ? (
              <button
                onClick={handleGatewayInit}
                disabled={busy}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Pay with {methodMeta?.label || 'Paystack'}
              </button>
            ) : (
              <button
                onClick={handleVerify}
                disabled={busy}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Verify Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION WARNING MODAL (WHEN ATTEMPTING TO LEAVE ACTIVE PAYSTACK SESSION) */}
      {pendingExit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={cancelExitAction} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-amber-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 border border-amber-200 mx-auto mb-4 text-amber-600">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              Cancel Active Paystack Session?
            </h3>
            <p className="text-xs text-gray-600 text-center leading-relaxed mb-4">
              You have an active Paystack payment session initialized (<span className="font-mono font-semibold text-gray-800">{gatewayRef}</span>). Leaving this window or changing payment methods will cancel this active session and you will need to start again.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={cancelExitAction}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Continue Payment
              </button>
              <button
                type="button"
                onClick={confirmExitAction}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Abandon & Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
