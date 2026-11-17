import React, { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import { formatSchoolDate } from '../../../../utils/schoolLocale.js';
import { listChildReportCards, downloadChildReportCard } from '../services/parentReportCardAPI.js';

const fileNameFor = (childName, card) =>
    `${[childName, card.termName, card.session].filter(Boolean).join(' ').replace(/[^A-Za-z0-9]+/g, '-')}-report-card.pdf`;

/** The report cards a school has released for one child, each with a download. */
export default function ChildReportCards({ childId, childName }) {
    const [cards, setCards] = useState(null);       // null while loading
    const [loadError, setLoadError] = useState(null);
    const [downloading, setDownloading] = useState(null); // termId being downloaded
    const [rowError, setRowError] = useState({});   // termId -> message
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setCards(null); setLoadError(null); setRowError({}); setDownloading(null);
        listChildReportCards(childId)
            .then((list) => { if (!cancelled) setCards(list); })
            .catch((e) => { if (!cancelled) setLoadError(e.message); });
        return () => { cancelled = true; };
    }, [childId, attempt]);

    const download = async (card) => {
        setDownloading(card.termId);
        setRowError((errors) => ({ ...errors, [card.termId]: null }));
        try {
            await downloadChildReportCard(childId, card.termId, fileNameFor(childName, card));
        } catch (e) {
            setRowError((errors) => ({ ...errors, [card.termId]: e.message }));
        } finally {
            setDownloading(null);
        }
    };

    if (loadError) {
        return (
            <div role="alert" className="text-[12px] text-red-600">
                {loadError}{' '}
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">Try again</button>
            </div>
        );
    }

    if (cards === null) {
        return <p role="status" className="flex items-center gap-2 text-[12px] text-slate-400"><Loader2 size={12} className="animate-spin" /> Loading report cards…</p>;
    }

    if (cards.length === 0) {
        return <p className="text-[12px] text-slate-400 italic">No report cards have been released yet.</p>;
    }

    return (
        <ul className="space-y-3">
            {cards.map((card) => (
                <li key={card.termId} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-[13px] font-semibold text-slate-700">
                                {card.termName}{card.session ? ` · ${card.session}` : ''}
                            </p>
                            {card.releasedAt && (
                                <p className="text-[11px] text-slate-500 mt-0.5">Released {formatSchoolDate(card.releasedAt)}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => download(card)}
                            disabled={downloading !== null}
                            aria-busy={downloading === card.termId}
                            aria-label={`Download ${card.termName}${card.session ? ` ${card.session}` : ''} report card`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#002684] text-white text-[12px] font-semibold rounded-lg disabled:opacity-50"
                        >
                            {downloading === card.termId ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                            {downloading === card.termId ? 'Preparing…' : 'Download'}
                        </button>
                    </div>
                    {rowError[card.termId] && (
                        <p role="alert" className="mt-2 text-[11px] text-red-600">{rowError[card.termId]}</p>
                    )}
                </li>
            ))}
        </ul>
    );
}
