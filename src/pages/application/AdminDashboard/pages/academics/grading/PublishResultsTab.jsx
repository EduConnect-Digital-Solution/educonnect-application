import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Loader2, CheckCircle2, XCircle, Lock, Send, FileDown, ShieldCheck,
} from 'lucide-react';
import { StatusChip, EmptyState, ConfirmDestructiveDialog, pushToast } from '../../../../../../components/patterns';
import { useAcademic } from '../../../../../../contexts/AcademicContext.jsx';
import { getSchoolClasses } from '../../../services/classAPIs.js';
import {
    getPublishStatus, publishResults, generateResultPdfs, getPdfJob,
} from '../../../services/gradingAPIs.js';

// ─── Checklist row ───────────────────────────────────────────────────────────────

function CheckRow({ item }) {
    const Icon = item.passed ? CheckCircle2 : XCircle;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
            <Icon size={18} className={`shrink-0 mt-0.5 ${item.passed ? 'text-green-600' : 'text-red-500'}`} />
            <div className="flex-1">
                <p className={`text-sm font-semibold ${item.passed ? 'text-gray-800' : 'text-red-700'}`}>{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
            </div>
            <StatusChip tone={item.passed ? 'green' : 'red'} size="xs" dot={false}>
                {item.passed ? 'Pass' : 'Action needed'}
            </StatusChip>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main tab
// ═════════════════════════════════════════════════════════════════════════════

export default function PublishResultsTab() {
    const { currentTerm, loading: scopeLoading } = useAcademic();

    const [classes, setClasses]   = useState([]);
    const [classId, setClassId]   = useState('');
    const [loadingClasses, setLoadingClasses] = useState(true);

    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);
    const [status, setStatus]     = useState(null);

    const [confirmOpen, setConfirmOpen] = useState(false);

    // PDF job state
    const [pdfJob, setPdfJob]     = useState(null); // { jobId, status, progress, downloadUrl }
    const [generating, setGenerating] = useState(false);
    const pollRef = useRef(null);

    useEffect(() => {
        setLoadingClasses(true);
        getSchoolClasses()
            .then(res => setClasses(res.data?.classes ?? []))
            .catch(() => pushToast({ message: 'Failed to load classes.', type: 'error' }))
            .finally(() => setLoadingClasses(false));
    }, []);

    const load = useCallback(async () => {
        if (!classId || !currentTerm?.id) { setStatus(null); return; }
        setLoading(true); setError(null);
        try {
            const res = await getPublishStatus(currentTerm.id, classId);
            setStatus(res.data);
        } catch (e) {
            setError(e?.message || 'Failed to load publish status.');
        } finally {
            setLoading(false);
        }
    }, [classId, currentTerm?.id]);

    useEffect(() => { load(); }, [load]);

    // Cleanup poll on unmount
    useEffect(() => () => clearInterval(pollRef.current), []);

    const checklist = status?.checklist;
    const allPass   = checklist && Object.values(checklist).every(c => c.passed);
    const published = status?.published;
    const className = classes.find(c => c.id === classId)?.name ?? '';
    const isLoading = scopeLoading || loading;

    // Thrown errors surface inline inside the dialog; success auto-closes it.
    const handlePublish = async () => {
        const res = await publishResults({ termId: currentTerm.id, classId });
        setStatus(prev => ({ ...prev, published: true, publishedAt: res.data.publishedAt }));
        pushToast({ message: `Results published for ${className} · ${currentTerm.name}.`, type: 'success' });
    };

    const startPdfGeneration = async () => {
        setGenerating(true);
        setPdfJob(null);
        try {
            const res = await generateResultPdfs({ termId: currentTerm.id, classId });
            const jobId = res.data.jobId;
            setPdfJob({ jobId, status: 'processing', progress: 0, downloadUrl: null });

            clearInterval(pollRef.current);
            pollRef.current = setInterval(async () => {
                try {
                    const jobRes = await getPdfJob(jobId);
                    setPdfJob(jobRes.data);
                    if (jobRes.data.status === 'completed' || jobRes.data.status === 'failed') {
                        clearInterval(pollRef.current);
                        setGenerating(false);
                        if (jobRes.data.status === 'completed') {
                            pushToast({ message: 'Result PDFs generated.', type: 'success' });
                        }
                    }
                } catch {
                    clearInterval(pollRef.current);
                    setGenerating(false);
                }
            }, 600);
        } catch (e) {
            pushToast({ message: e?.message || 'Could not start PDF generation.', type: 'error' });
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Publish Results</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Run the pre-publish checks, then lock the term's grades and make them
                        eligible for report cards.
                    </p>
                </div>
            </div>

            {/* Class selector */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">Class</label>
                    <select
                        value={classId}
                        onChange={e => setClassId(e.target.value)}
                        disabled={loadingClasses}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                    >
                        <option value="">— select class —</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* No term */}
            {!currentTerm?.id && !scopeLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 font-medium">
                    Select an academic term above to check publish readiness.
                </div>
            )}

            {/* Loading */}
            {isLoading && classId && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
            )}

            {/* Error */}
            {!isLoading && error && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            )}

            {/* Idle */}
            {!isLoading && !error && !classId && currentTerm?.id && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState
                        variant="first-use"
                        title="Select a class to publish"
                        description="Choose a class above to see whether its results are ready to publish for the current term."
                    />
                </div>
            )}

            {/* Status loaded */}
            {!isLoading && !error && status && classId && (
                <>
                    {/* Already published */}
                    {published && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                            <Lock size={20} className="text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-green-900">
                                    Results published for {className} · {currentTerm.name}
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                    Grades for this term are locked. Published on{' '}
                                    {status.publishedAt
                                        ? new Date(status.publishedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : '—'}.
                                    Un-publishing requires a separate admin action.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Pre-publish checklist */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={16} className="text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-900">Pre-publish checklist</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            All checks must pass before results can be published for {className}.
                        </p>
                        <div>
                            {checklist && Object.entries(checklist).map(([key, item]) => (
                                <CheckRow key={key} item={item} />
                            ))}
                        </div>

                        {!published && (
                            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs text-gray-400 max-w-md">
                                    {allPass
                                        ? 'All checks passed. Publishing locks every grade for this term and class.'
                                        : 'Resolve the failing checks above to enable publishing.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={!allPass}
                                    className="px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <Send size={15} /> Publish Results
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bulk PDF generation — available once published */}
                    {published && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <FileDown size={16} className="text-gray-400" />
                                <h3 className="text-sm font-bold text-gray-900">Bulk result PDFs</h3>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Generate downloadable result slips for every student in {className}.
                            </p>

                            {pdfJob && pdfJob.status === 'processing' && (
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Generating…</span>
                                        <span className="font-semibold text-gray-700">{pdfJob.progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pdfJob.progress}%` }} />
                                    </div>
                                </div>
                            )}

                            {pdfJob && pdfJob.status === 'completed' ? (
                                <a
                                    href={pdfJob.downloadUrl}
                                    onClick={(e) => { e.preventDefault(); pushToast({ message: 'Mock download — backend will return a real file URL.', type: 'success' }); }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    <FileDown size={15} /> Download all PDFs
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startPdfGeneration}
                                    disabled={generating}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
                                >
                                    {generating ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                                    {generating ? 'Generating…' : 'Generate result PDFs'}
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Confirm publish — type-to-confirm friction for an irreversible lock */}
            <ConfirmDestructiveDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handlePublish}
                requireReason={false}
                verb="Publish"
                noun="results"
                recordName={className}
                consequence={`This locks all grades for ${className} · ${currentTerm?.name}. Teachers can no longer edit score sheets for this term.`}
            />
        </div>
    );
}
