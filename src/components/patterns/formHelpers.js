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
