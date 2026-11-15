import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, Download, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import { Drawer, ConfirmDestructiveDialog, pushToast } from '../../../../../components/patterns';
import { getChecklist, uploadDocument, getDownloadLink, deleteDocument } from '../../services/documentsAPI.js';
import { formatSchoolDate } from '../../../../../utils/schoolLocale.js';

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const EXT = { 'application/pdf': 'PDF', 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };

// Opens a signed link in a new tab. The link expires in about a minute, so it is asked for at the moment of opening.
function openLink(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
}

/**
 * The documents a person must have on file, with upload, open and delete for each.
 * ownerType is applicant | student | staff. For an applicant this is the admission requirements checklist.
 */
export default function DocumentChecklist({ open, onClose, ownerType, ownerId, ownerName }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(null);      // type id or file id being worked on
    const [toDelete, setToDelete] = useState(null);
    const inputs = useRef({});
    const latest = useRef(ownerId); // the person whose documents are open now
    latest.current = ownerId;

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const result = await getChecklist(ownerType, ownerId);
            if (latest.current === ownerId) setData(result); // a late answer for someone else is ignored
        } catch (e) { if (latest.current === ownerId) setError(e.message); }
        finally { if (latest.current === ownerId) setLoading(false); }
    }, [ownerType, ownerId]);

    useEffect(() => { setData(null); if (open && ownerId) load(); }, [open, ownerId, load]);

    const onPick = async (type, file) => {
        if (!file) return;
        if (file.size > type.maxSizeMb * 1024 * 1024) {
            pushToast({ message: `That file is larger than the ${type.maxSizeMb} MB limit for ${type.name}.`, type: 'error' });
            return;
        }
        setBusy(type.id);
        try {
            await uploadDocument({ typeId: type.id, ownerType, ownerId, file });
            pushToast({ message: `${type.name} uploaded.`, type: 'success' });
            await load();
        } catch (e) {
            pushToast({ message: e.message, type: 'error' });
        } finally {
            setBusy(null);
            if (inputs.current[type.id]) inputs.current[type.id].value = '';
        }
    };

    const openFile = async (file) => {
        setBusy(file.id);
        try { openLink((await getDownloadLink(file.id)).url); }
        catch (e) { pushToast({ message: e.message, type: 'error' }); }
        finally { setBusy(null); }
    };

    const confirmDelete = async () => {
        const file = toDelete;
        await deleteDocument(file.id);
        pushToast({ message: 'File deleted.', type: 'success' });
        setToDelete(null);
        await load();
    };

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                title="Documents"
                subtitle={ownerName ? `${ownerName}${data && data.requiredCount ? ` · ${data.requiredCount - data.requiredMissing} of ${data.requiredCount} required on file` : ''}` : ''}
                footer={<button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>}
            >
                {loading && !data && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
                {error && <div role="alert" className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
                {data && data.items.length === 0 && (
                    <p className="text-sm text-gray-500">No document types apply here yet. Set them up under Settings, Documents.</p>
                )}
                {data && data.items.map(({ type, files, complete }) => (
                    <section key={type.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                            {complete
                                ? <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" aria-label="On file" />
                                : <Circle size={18} className={`${type.required ? 'text-amber-500' : 'text-gray-300'} mt-0.5 shrink-0`} aria-label="Not on file" />}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                    {type.name}
                                    {type.required && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-amber-700">Required</span>}
                                </p>
                                {type.description && <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {type.allowedMimeTypes.map((m) => EXT[m] || m).join(', ')} · up to {type.maxSizeMb} MB
                                </p>
                            </div>
                        </div>

                        {files.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <FileText size={15} className="text-gray-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium text-gray-800 truncate">{f.fileName}</p>
                                    <p className="text-[11px] text-gray-500">{kb(f.sizeBytes)} · added {formatSchoolDate(f.uploadedAt)}</p>
                                </div>
                                <button onClick={() => openFile(f)} disabled={busy === f.id} aria-label={`Open ${f.fileName}`} className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                                    {busy === f.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                </button>
                                <button onClick={() => setToDelete(f)} aria-label={`Delete ${f.fileName}`} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}

                        <div>
                            <input
                                ref={(el) => { inputs.current[type.id] = el; }}
                                id={`doc-${type.id}`} type="file" className="sr-only"
                                accept={type.allowedMimeTypes.join(',')}
                                onChange={(e) => onPick(type, e.target.files?.[0])}
                            />
                            <label htmlFor={`doc-${type.id}`}
                                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer ${busy === type.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                {busy === type.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {busy === type.id ? 'Uploading…' : files.length ? 'Add another file' : 'Upload a file'}
                            </label>
                        </div>
                    </section>
                ))}
            </Drawer>

            <ConfirmDestructiveDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                verb="Delete"
                noun="file"
                recordName={toDelete?.fileName || ''}
                requireReason={false}
                consequence="The file is removed from storage for good."
                onConfirm={confirmDelete}
            />
        </>
    );
}
