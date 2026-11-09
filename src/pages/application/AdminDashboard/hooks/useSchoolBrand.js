import { useState, useEffect } from 'react';
import { getSchoolProfile } from '../../../auth/authAPIs.js';
import { getSchoolSettings, uploadPendingLogo } from '../services/onboardingAPIs.js';
import { useAuth } from '../../../../contexts/AuthContext.jsx';

const CACHE_KEY = 'educonnect-school-brand-v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // refresh daily

/**
 * useSchoolBrand — the school's name/ID + logo for branding (sidebar, etc.).
 * Name/ID come from the profile (cached daily). The logo is read from the
 * school settings API and updates live when changed.
 */
export default function useSchoolBrand() {
    const { user } = useAuth();
    const email = user?.email ?? null;
    const [brand, setBrand] = useState(() => {
        let base = null;
        try {
            const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (raw && Date.now() - raw.ts < CACHE_TTL) base = raw.brand;
        } catch { /* ignore */ }
        return base ?? null;
    });

    const hasBrand = !!brand;

    useEffect(() => {
        // Fetch the logo (and push up one chosen at registration, if any); keep it
        // in sync when it's uploaded/changed elsewhere.
        let alive = true;
        const syncLogo = async () => {
            try {
                let { logoUrl } = await getSchoolSettings();
                if (!logoUrl) logoUrl = await uploadPendingLogo(email);
                if (alive) setBrand(prev => (prev ? { ...prev, logoUrl: logoUrl ?? null } : prev));
            } catch { /* branding is decorative: fail silently */ }
        };
        syncLogo();
        window.addEventListener('school-brand-changed', syncLogo);
        return () => { alive = false; window.removeEventListener('school-brand-changed', syncLogo); };
    }, [hasBrand, email]);

    useEffect(() => {
        if (brand) return;
        let alive = true;
        (async () => {
            try {
                const res = await getSchoolProfile();
                const school = res?.data?.school;
                if (!school || !alive) return;
                const next = {
                    name: school.schoolName ?? 'Your school',
                    schoolId: school.schoolId ?? '',
                    type: school.schoolType ?? '',
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), brand: next }));
                setBrand({ ...next, logoUrl: null });
            } catch { /* branding is decorative — fail silently */ }
        })();
        return () => { alive = false; };
    }, [brand]);

    return brand;
}
