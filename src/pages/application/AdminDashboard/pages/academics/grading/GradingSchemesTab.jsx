import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, Pencil, Check, X, Loader2, Star, StarOff, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
    WorkbenchTable, StatusChip, ConfirmDestructiveDialog, Drawer, pushToast,
} from '../../../../../../components/patterns';
import {
    listGradingScales,
    createGradingScale,
    getGradingScale,
    updateGradingScale,
    deleteGradingScale,
    setDefaultGradingScale,
    addGradeBand,
    updateGradeBand,
    deleteGradeBand,
} from '../../../services/gradingAPIs.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_BAND = () => ({
    _key: `b_${Date.now()}_${Math.random()}`,
    label: '',
    minPercent: '',
    maxPercent: '',
    gradePoints: '',
});

function detectOverlap(bands) {
    for (let i = 0; i < bands.length; i++) {
        for (let j = i + 1; j < bands.length; j++) {
            const aMin = Number(bands[i].minPercent);
            const aMax = Number(bands[i].maxPercent);
            const bMin = Number(bands[j].minPercent);
            const bMax = Number(bands[j].maxPercent);
            if (!isNaN(aMin) && !isNaN(aMax) && !isNaN(bMin) && !isNaN(bMax)) {
                if (aMin <= bMax && bMin <= aMax) return true;
            }
        }
    }
    return false;
}

// ─── Band builder (used in Create drawer) ─────────────────────────────────────

function BandBuilderTable({ bands, onChange }) {
    const updateBand = (key, field, value) =>
        onChange(bands.map(b => b._key === key ? { ...b, [field]: value } : b));

    const removeBand = (key) => {
        if (bands.length === 1) return;
        onChange(bands.filter(b => b._key !== key));
    };

    const addBand = () => onChange([...bands, EMPTY_BAND()]);

    const overlap = detectOverlap(bands);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Grade Bands
                </label>
                <button
                    type="button"
                    onClick={addBand}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <Plus size={12} /> Add Band
                </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_32px] gap-2 px-2 mb-1">
                {['Label', 'Min %', 'Max %', 'Grade Points', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {h}
                    </span>
                ))}
            </div>

            <div className="space-y-1.5">
                {bands.map((band) => (
                    <div key={band._key} className="grid grid-cols-[80px_1fr_1fr_1fr_32px] gap-2 items-center">
                        <input
                            value={band.label}
                            onChange={e => updateBand(band._key, 'label', e.target.value)}
                            placeholder="A1"
                            maxLength={4}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                        />
                        <input
                            type="number"
                            value={band.minPercent}
                            onChange={e => updateBand(band._key, 'minPercent', e.target.value)}
                            placeholder="0"
                            min={0} max={100}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <input
                            type="number"
                            value={band.maxPercent}
                            onChange={e => updateBand(band._key, 'maxPercent', e.target.value)}
                            placeholder="100"
                            min={0} max={100}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <input
                            type="number"
                            value={band.gradePoints}
                            onChange={e => updateBand(band._key, 'gradePoints', e.target.value)}
                            placeholder="4.0"
                            min={0} step="0.1"
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                            type="button"
                            onClick={() => removeBand(band._key)}
                            disabled={bands.length === 1}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            {overlap && (
                <p className="mt-3 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Two or more bands have overlapping percentage ranges. Please adjust the values.
                </p>
            )}
        </div>
    );
}

// ─── Create drawer ─────────────────────────────────────────────────────────────

function CreateScaleDrawer({ open, onClose, onCreated }) {
    const [name, setName]       = useState('');
    const [desc, setDesc]       = useState('');
    const [bands, setBands]     = useState([EMPTY_BAND()]);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState(null);

    // Reset form when drawer opens
    useEffect(() => {
        if (open) {
            setName(''); setDesc('');
            setBands([EMPTY_BAND()]);
            setSaving(false); setError(null);
        }
    }, [open]);

    const validate = () => {
        if (!name.trim()) return 'Scheme name is required.';
        if (bands.some(b => !b.label.trim())) return 'Every band must have a label.';
        if (bands.some(b => b.minPercent === '' || b.maxPercent === ''))
            return 'Every band must have both a minimum and maximum percentage.';
        if (bands.some(b => Number(b.minPercent) > Number(b.maxPercent)))
            return 'Min % cannot be greater than Max % in any band.';
        if (detectOverlap(bands)) return 'Grade bands have overlapping percentage ranges.';
        return null;
    };

    const handleCreate = async () => {
        const err = validate();
        if (err) { setError(err); return; }

        const payload = {
            name: name.trim(),
            description: desc.trim() || undefined,
            bands: bands.map((b, i) => ({
                label:       b.label.trim().toUpperCase(),
                minPercent:  Number(b.minPercent),
                maxPercent:  Number(b.maxPercent),
                gradePoints: b.gradePoints !== '' ? Number(b.gradePoints) : 0,
                sortOrder:   i,
            })),
        };

        setSaving(true); setError(null);
        try {
            const res = await createGradingScale(payload);
            if (res.success) {
                const created = res.data?.gradingScale ?? res.data;
                pushToast({ message: `"${name.trim()}" scheme created.`, type: 'success' });
                onCreated(created);
                onClose();
            }
        } catch (e) {
            setError(e?.message || 'Failed to create grading scheme.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="New Grading Scheme"
            subtitle="Define the grade bands that will appear on report cards."
            width="max-w-xl"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Create Scheme
                    </button>
                </>
            }
        >
            {/* Meta */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Scheme Details
                </h3>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Scheme Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Standard Junior Scale"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Optional — e.g. Used for JSS1–JSS3"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* Bands */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Grade Bands
                </h3>
                <p className="text-xs text-gray-400">
                    Add one row per grade. Bands must not overlap.
                </p>
                <BandBuilderTable bands={bands} onChange={setBands} />
            </div>

            {/* Form-level error */}
            {error && (
                <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}
        </Drawer>
    );
}

// ─── Manage drawer (edit meta + band management) ───────────────────────────────

function ManageScaleDrawer({ scale, open, onClose, onUpdated }) {
    const [fullScale, setFullScale]     = useState(null);
    const [fetching, setFetching]       = useState(false);

    // Meta editing
    const [metaName, setMetaName]       = useState('');
    const [metaDesc, setMetaDesc]       = useState('');
    const [savingMeta, setSavingMeta]   = useState(false);

    // Band in-place editing
    const [editingBandId, setEditingBandId] = useState(null);
    const [editDraft, setEditDraft]         = useState({});
    const [savingBandId, setSavingBandId]   = useState(null);
    const [deletingBandId, setDeletingBandId] = useState(null);

    // Add band form
    const [addOpen, setAddOpen]         = useState(false);
    const [addDraft, setAddDraft]       = useState({ label: '', minPercent: '', maxPercent: '', gradePoints: '' });
    const [addingBand, setAddingBand]   = useState(false);
    const [addError, setAddError]       = useState(null);

    // Fetch full scale detail when drawer opens
    useEffect(() => {
        if (!open || !scale?.id) return;
        setFetching(true);
        setEditingBandId(null);
        setAddOpen(false);

        getGradingScale(scale.id)
            .then(res => {
                const s = res.data?.gradingScale ?? res.data;
                setFullScale(s);
                setMetaName(s.name ?? '');
                setMetaDesc(s.description ?? '');
            })
            .catch(() => pushToast({ message: 'Failed to load scheme details.', type: 'error' }))
            .finally(() => setFetching(false));
    }, [open, scale?.id]);

    // Save name / description
    const handleSaveMeta = async () => {
        if (!metaName.trim()) {
            pushToast({ message: 'Scheme name is required.', type: 'error' }); return;
        }
        setSavingMeta(true);
        try {
            await updateGradingScale(fullScale.id, {
                name: metaName.trim(),
                description: metaDesc.trim() || undefined,
            });
            setFullScale(prev => ({ ...prev, name: metaName.trim(), description: metaDesc.trim() }));
            onUpdated({ ...fullScale, name: metaName.trim(), description: metaDesc.trim() });
            pushToast({ message: 'Scheme details saved.', type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to save details.', type: 'error' });
        } finally {
            setSavingMeta(false);
        }
    };

    // Start editing a band
    const startEditBand = (band) => {
        setEditingBandId(band.id);
        setEditDraft({
            label:       band.label,
            minPercent:  String(band.minPercent),
            maxPercent:  String(band.maxPercent),
            gradePoints: String(band.gradePoints),
        });
    };

    // Save edited band
    const handleSaveBand = async () => {
        if (!editDraft.label?.trim()) {
            pushToast({ message: 'Band label is required.', type: 'error' }); return;
        }
        setSavingBandId(editingBandId);
        try {
            await updateGradeBand(fullScale.id, editingBandId, {
                label:       editDraft.label.trim().toUpperCase(),
                minPercent:  Number(editDraft.minPercent),
                maxPercent:  Number(editDraft.maxPercent),
                gradePoints: Number(editDraft.gradePoints),
            });
            setFullScale(prev => ({
                ...prev,
                bands: prev.bands.map(b =>
                    b.id === editingBandId
                        ? { ...b, label: editDraft.label.trim().toUpperCase(), minPercent: Number(editDraft.minPercent), maxPercent: Number(editDraft.maxPercent), gradePoints: Number(editDraft.gradePoints) }
                        : b,
                ),
            }));
            setEditingBandId(null);
            pushToast({ message: 'Band updated.', type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to update band.', type: 'error' });
        } finally {
            setSavingBandId(null);
        }
    };

    // Delete a band
    const handleDeleteBand = async (bandId) => {
        if (!confirm('Remove this grade band?')) return;
        setDeletingBandId(bandId);
        try {
            await deleteGradeBand(fullScale.id, bandId);
            setFullScale(prev => ({ ...prev, bands: prev.bands.filter(b => b.id !== bandId) }));
            pushToast({ message: 'Band removed.', type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to remove band.', type: 'error' });
        } finally {
            setDeletingBandId(null);
        }
    };

    // Add new band
    const handleAddBand = async () => {
        if (!addDraft.label.trim()) { setAddError('Label is required.'); return; }
        if (addDraft.minPercent === '' || addDraft.maxPercent === '') {
            setAddError('Min % and Max % are required.'); return;
        }
        setAddError(null);
        setAddingBand(true);
        try {
            const nextSort = (fullScale.bands?.length ?? 0);
            const res = await addGradeBand(fullScale.id, {
                label:       addDraft.label.trim().toUpperCase(),
                minPercent:  Number(addDraft.minPercent),
                maxPercent:  Number(addDraft.maxPercent),
                gradePoints: addDraft.gradePoints !== '' ? Number(addDraft.gradePoints) : 0,
                sortOrder:   nextSort,
            });
            const newBand = res.data?.band ?? res.data;
            setFullScale(prev => ({ ...prev, bands: [...(prev.bands ?? []), newBand] }));
            setAddDraft({ label: '', minPercent: '', maxPercent: '', gradePoints: '' });
            setAddOpen(false);
            pushToast({ message: 'Band added.', type: 'success' });
        } catch (e) {
            setAddError(e?.message || 'Failed to add band.');
        } finally {
            setAddingBand(false);
        }
    };

    const bands = fullScale?.bands ?? [];
    const sortedBands = [...bands].sort((a, b) => b.minPercent - a.minPercent);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={fullScale?.name ?? scale?.name ?? 'Manage Scheme'}
            subtitle="Edit name, description, and manage grade bands."
            width="max-w-xl"
        >
            {fetching ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
            ) : fullScale ? (
                <>
                    {/* ── Meta ── */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                            Scheme Details
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                value={metaName}
                                onChange={e => setMetaName(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                            <input
                                value={metaDesc}
                                onChange={e => setMetaDesc(e.target.value)}
                                placeholder="Optional"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveMeta}
                            disabled={savingMeta}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                        >
                            {savingMeta && <Loader2 size={13} className="animate-spin" />}
                            Save Changes
                        </button>
                    </div>

                    {/* ── Bands ── */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                            Grade Bands ({sortedBands.length})
                        </h3>

                        {sortedBands.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No bands yet.</p>
                        ) : (
                            <div className="space-y-1">
                                {/* Column labels */}
                                <div className="grid grid-cols-[56px_1fr_1fr_1fr_68px] gap-2 px-2">
                                    {['Label', 'Min %', 'Max %', 'Points', ''].map(h => (
                                        <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {h}
                                        </span>
                                    ))}
                                </div>

                                {sortedBands.map(band => {
                                    const isEditing = editingBandId === band.id;
                                    const isSaving  = savingBandId === band.id;
                                    const isDeleting = deletingBandId === band.id;

                                    return (
                                        <div
                                            key={band.id}
                                            className={`grid grid-cols-[56px_1fr_1fr_1fr_68px] gap-2 items-center p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-blue-50/60 border border-blue-100' : 'hover:bg-gray-50'}`}
                                        >
                                            {isEditing ? (
                                                <>
                                                    <input value={editDraft.label} onChange={e => setEditDraft(d => ({ ...d, label: e.target.value }))} maxLength={4} className="px-2 py-1 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
                                                    <input type="number" value={editDraft.minPercent} onChange={e => setEditDraft(d => ({ ...d, minPercent: e.target.value }))} min={0} max={100} className="px-2 py-1 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                                    <input type="number" value={editDraft.maxPercent} onChange={e => setEditDraft(d => ({ ...d, maxPercent: e.target.value }))} min={0} max={100} className="px-2 py-1 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                                    <input type="number" value={editDraft.gradePoints} onChange={e => setEditDraft(d => ({ ...d, gradePoints: e.target.value }))} min={0} step="0.1" className="px-2 py-1 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={handleSaveBand} disabled={isSaving} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button onClick={() => setEditingBandId(null)} className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-bold text-gray-800 uppercase">{band.label}</span>
                                                    <span className="text-sm text-gray-600 font-mono">{band.minPercent}</span>
                                                    <span className="text-sm text-gray-600 font-mono">{band.maxPercent}</span>
                                                    <span className="text-sm text-gray-500 font-mono">{band.gradePoints}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => startEditBand(band)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button onClick={() => handleDeleteBand(band.id)} disabled={isDeleting} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                                                            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add band row */}
                        {addOpen ? (
                            <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-xl mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Label *</label>
                                        <input value={addDraft.label} onChange={e => setAddDraft(d => ({ ...d, label: e.target.value }))} placeholder="e.g. A1" maxLength={4} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Grade Points</label>
                                        <input type="number" value={addDraft.gradePoints} onChange={e => setAddDraft(d => ({ ...d, gradePoints: e.target.value }))} placeholder="4.0" min={0} step="0.1" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Min % *</label>
                                        <input type="number" value={addDraft.minPercent} onChange={e => setAddDraft(d => ({ ...d, minPercent: e.target.value }))} placeholder="0" min={0} max={100} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Max % *</label>
                                        <input type="number" value={addDraft.maxPercent} onChange={e => setAddDraft(d => ({ ...d, maxPercent: e.target.value }))} placeholder="100" min={0} max={100} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>
                                {addError && (
                                    <p className="text-[11px] font-medium text-red-600">{addError}</p>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={handleAddBand} disabled={addingBand} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {addingBand && <Loader2 size={13} className="animate-spin" />}
                                        Add Band
                                    </button>
                                    <button onClick={() => { setAddOpen(false); setAddError(null); setAddDraft({ label: '', minPercent: '', maxPercent: '', gradePoints: '' }); }} className="px-3 py-1.5 bg-white border border-gray-200 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddOpen(true)}
                                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1"
                            >
                                <Plus size={14} /> Add Band
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Could not load scheme details.</p>
            )}
        </Drawer>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main tab component
// ═════════════════════════════════════════════════════════════════════════════

export default function GradingSchemesTab() {
    const [scales, setScales]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);

    const [createOpen, setCreateOpen]       = useState(false);
    const [manageTarget, setManageTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget]   = useState(null);
    const [settingDefaultId, setSettingDefaultId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await listGradingScales();
            setScales(Array.isArray(res.data) ? res.data : (res.data?.gradingScales ?? []));
        } catch (e) {
            setError(e?.message || 'Failed to load grading schemes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreated = (newScale) => {
        setScales(prev => [...prev, newScale]);
    };

    const handleUpdated = (updated) => {
        setScales(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    };

    const handleSetDefault = async (scale) => {
        setSettingDefaultId(scale.id);
        try {
            await setDefaultGradingScale(scale.id);
            setScales(prev => prev.map(s => ({ ...s, isDefault: s.id === scale.id })));
            pushToast({ message: `"${scale.name}" is now the default scheme.`, type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to set default.', type: 'error' });
        } finally {
            setSettingDefaultId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await deleteGradingScale(deleteTarget.id);
        setScales(prev => prev.filter(s => s.id !== deleteTarget.id));
        pushToast({ message: `"${deleteTarget.name}" deleted.`, type: 'success' });
    };

    // ── Table columns ──────────────────────────────────────────────────────────

    const columns = [
        {
            id: 'name',
            header: 'Scheme Name',
            accessor: r => r.name,
            sortable: true,
        },
        {
            id: 'description',
            header: 'Description',
            accessor: r => r.description || '—',
            hideable: true,
        },
        {
            id: 'bands',
            header: 'Grade Bands',
            accessor: r => r.bands?.length ?? 0,
            render: r => (
                <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-gray-800 text-sm">{r.bands?.length ?? 0}</span>
                    <span className="text-gray-400 text-sm">bands</span>
                </span>
            ),
            sortable: true,
            width: '130px',
        },
        {
            id: 'status',
            header: 'Status',
            accessor: r => r.isDefault ? 'Default' : '',
            render: r => r.isDefault
                ? <StatusChip tone="green">Default</StatusChip>
                : <span className="text-gray-300 text-sm">—</span>,
            width: '110px',
        },
        {
            id: 'actions',
            header: '',
            hideable: false,
            render: r => (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setManageTarget(r)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Manage
                    </button>
                    {!r.isDefault && (
                        <button
                            onClick={() => handleSetDefault(r)}
                            disabled={settingDefaultId === r.id}
                            title="Set as default scheme"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-40 transition-colors"
                        >
                            {settingDefaultId === r.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Star size={14} />}
                        </button>
                    )}
                    <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete scheme"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
            width: '170px',
        },
    ];

    return (
        <>
            <WorkbenchTable
                title="Grading Schemes"
                storageKey="grading-schemes"
                columns={columns}
                rows={scales}
                loading={loading}
                error={error}
                onRetry={load}
                searchPlaceholder="Search schemes…"
                searchKeys={['name', 'description']}
                primaryAction={{
                    label: 'New Scheme',
                    icon: Plus,
                    onClick: () => setCreateOpen(true),
                }}
                emptyState={{
                    title: 'No grading schemes yet',
                    description: 'Create your first grading scheme to define the grade bands (A1, B2…) used on report cards.',
                    action: { label: 'New Scheme', onClick: () => setCreateOpen(true) },
                }}
            />

            <CreateScaleDrawer
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />

            <ManageScaleDrawer
                scale={manageTarget}
                open={Boolean(manageTarget)}
                onClose={() => setManageTarget(null)}
                onUpdated={handleUpdated}
            />

            <ConfirmDestructiveDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                verb="Delete"
                noun="grading scheme"
                recordName={deleteTarget?.name ?? ''}
                consequence="All grade band definitions will be permanently removed."
                requireReason={false}
                onConfirm={handleDelete}
            />
        </>
    );
}
