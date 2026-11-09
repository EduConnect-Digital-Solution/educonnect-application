import React, { useState, useRef } from 'react';
import { Camera, Loader2, X, AlertTriangle } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../utils/cloudinary.js';

/**
 * ImageUploadField — pick an image → upload to Cloudinary → return the URL.
 *
 * Used in every create/update flow for the optional `profileImage` field.
 *   <ImageUploadField name="Ada Ife" value={url} onChange={setUrl} />
 *
 * Stores only the hosted URL (via onChange). Optional — leaving it empty keeps
 * profileImage null. Shows loading + error states and never fakes a URL.
 */
export default function ImageUploadField({ name = '', value, onChange, label = 'Profile photo', size = 64 }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const configured = isCloudinaryConfigured();

    const pick = () => { if (!busy && configured) inputRef.current?.click(); };

    const handleFile = async (file) => {
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
            const url = await uploadToCloudinary(file);
            onChange?.(url);
        } catch (e) {
            setError(e?.message || 'Upload failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            {label && <p className="text-[12px] font-semibold text-gray-700 mb-1.5">{label} <span className="text-gray-400 font-normal">(optional)</span></p>}
            <div className="flex items-center gap-3">
                <button type="button" onClick={pick}
                    className={`relative group rounded-full ${configured ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <Avatar name={name} src={value} size={size} />
                    <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {busy ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
                    </span>
                </button>

                <div className="min-w-0">
                    {configured ? (
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={pick} disabled={busy}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                                {busy ? 'Uploading…' : value ? 'Change' : 'Upload'}
                            </button>
                            {value && !busy && (
                                <button type="button" onClick={() => onChange?.(null)}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-red-500">
                                    <X size={12} /> Remove
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                            <AlertTriangle size={12} /> Image upload not configured (Cloudinary).
                        </p>
                    )}
                    {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
                </div>

                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0])} />
            </div>
        </div>
    );
}
