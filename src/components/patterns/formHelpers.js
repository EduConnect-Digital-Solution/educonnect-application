import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Form helpers — the non-component half of FormKit (styling, validation,
 * draft autosave). Kept separate from the JSX components for Fast Refresh.
 */

/** The standard text-input class — keep every input visually identical. */
export const inputClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 bg-white outline-none transition-colors ${
        hasError ? 'border-red-300 focus:border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-blue-400'
    }`;

/** Blur-validated errors that render beside fields. */
export function useFieldErrors(validators) {
    const [errors, setErrors] = useState({});

    const validateField = useCallback((name, value, all) => {
        const fn = validators?.[name];
        const error = fn ? fn(value, all) : null;
        setErrors(prev => ({ ...prev, [name]: error || undefined }));
        return !error;
    }, [validators]);

    const validateAll = useCallback((data) => {
        const next = {};
        let ok = true;
        Object.entries(validators ?? {}).forEach(([name, fn]) => {
            const error = fn(data[name], data);
            if (error) { next[name] = error; ok = false; }
        });
        setErrors(next);
        return ok;
    }, [validators]);

    return { errors, validateField, validateAll, clearErrors: () => setErrors({}) };
}

/** Autosave long forms to localStorage so a refresh never loses work. */
export function useFormDraft(storageKey, initial) {
    const [data, setData] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(`form-draft:${storageKey}`));
            if (saved) return { ...initial, ...saved };
        } catch { /* ignore */ }
        return initial;
    });
    const dirty = useRef(false);

    useEffect(() => {
        if (!dirty.current) return;
        const t = setTimeout(() => {
            localStorage.setItem(`form-draft:${storageKey}`, JSON.stringify(data));
        }, 600);
        return () => clearTimeout(t);
    }, [data, storageKey]);

    const update = useCallback((patch) => {
        dirty.current = true;
        setData(prev => ({ ...prev, ...patch }));
    }, []);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(`form-draft:${storageKey}`);
        dirty.current = false;
    }, [storageKey]);

    return { data, update, clearDraft };
}

/* ── Local drafts for "add" forms ─────────────────────────────────────────────
 * A half-filled form is kept in this browser until it is sent, so closing it by
 * mistake (or a refresh) never loses what was typed. Nothing reaches the server
 * before Submit. Drafts are keyed per school and per signed-in user, expire after
 * DRAFT_TTL_DAYS, and are wiped on sign-out (shared school computers).
 */
const DRAFT_PREFIX = 'form-draft:';
const DRAFT_TTL_DAYS = 7;

/**
 * Storage key for one form, scoped to the signed-in account. Keyed by e-mail because it is the same in the
 * login, /me and refresh payloads (ids are not always). Null when nobody is signed in: then nothing is stored.
 */
export const formDraftKey = (user, formName) => {
    const who = String(user?.email ?? '').trim().toLowerCase();
    return who ? `${DRAFT_PREFIX}${who}:${formName}` : null;
};

/** Returns { data, savedAt } or null. Expired or unreadable drafts are removed. */
export function readFormDraft(key) {
    if (!key) return null;
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (!saved || typeof saved.at !== 'number') return null;
        if (Date.now() - saved.at > DRAFT_TTL_DAYS * 864e5) { localStorage.removeItem(key); return null; }
        return { data: saved.data, savedAt: saved.at };
    } catch { return null; }
}

/** Saves `data`, or removes the draft when it is back to the empty form. */
export function writeFormDraft(key, data, empty) {
    if (!key) return;
    try {
        if (isSameForm(data, empty)) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify({ data, at: Date.now() }));
    } catch { /* storage full or blocked: the form still works, just without a draft */ }
}

export function clearFormDraft(key) {
    if (!key) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Removes every form draft in this browser (called on sign-out). */
export function clearAllFormDrafts() {
    try {
        Object.keys(localStorage).filter(k => k.startsWith(DRAFT_PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
}

/** True when two form states hold the same values (drafts are small, plain objects). */
export const isSameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** "today at 14:05" / "on 18 Nov at 09:12", for the restored-draft notice. */
export const draftTimeLabel = (ms) => {
    const d = new Date(ms);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString()
        ? `today at ${time}`
        : `on ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${time}`;
};
