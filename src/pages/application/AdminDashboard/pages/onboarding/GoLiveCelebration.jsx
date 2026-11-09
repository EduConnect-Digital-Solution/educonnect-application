import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, ClipboardCheck, Wallet, Users, FileBadge, ArrowRight, X } from 'lucide-react';
import { ROUTES } from '../../navigation/navConfig.js';

const NEXT_ACTIONS = [
    { label: 'Start taking attendance', icon: ClipboardCheck, to: ROUTES.attendance },
    { label: 'Generate fee invoices',   icon: Wallet,         to: ROUTES.invoices },
    { label: 'Invite more teachers',    icon: Users,          to: ROUTES.staff },
    { label: 'Create report cards',     icon: FileBadge,      to: ROUTES.reportCards },
];

/**
 * GoLiveCelebration — the 100%-complete moment. Celebration + "what you can do next".
 */
export default function GoLiveCelebration({ schoolName, onClose }) {
    const navigate = useNavigate();

    return createPortal(
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 z-10"><X size={18} /></button>

                <div className="px-8 pt-10 pb-6 text-center bg-gradient-to-b from-blue-50 to-white">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center ring-8 ring-blue-100">
                        <PartyPopper size={30} />
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-gray-900">{schoolName} is live! 🎉</h2>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                        Your school is fully set up. The dashboard is now your home — here's what you can do next.
                    </p>
                </div>

                <div className="px-6 pb-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5 px-1">What you can do next</p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                        {NEXT_ACTIONS.map(a => (
                            <button key={a.label} onClick={() => { onClose(); navigate(a.to); }}
                                className="group flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left">
                                <span className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><a.icon size={16} /></span>
                                <span className="flex-1 text-[13px] font-semibold text-gray-800">{a.label}</span>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                            </button>
                        ))}
                    </div>

                    <button onClick={() => { onClose(); navigate(ROUTES.home); }}
                        className="mt-4 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                        Go to my dashboard
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
