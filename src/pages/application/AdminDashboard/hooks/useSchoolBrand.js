import { useState, useEffect } from 'react';
import { getSchoolProfile } from '../../../auth/authAPIs.js';
import { getSchoolLogo } from '../services/onboardingAPIs.js';

const CACHE_KEY = 'educonnect-school-brand-v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // refresh daily

/**
 * useSchoolBrand — the school's name/ID + logo for branding (sidebar, etc.).
 * Name/ID come from the profile (cached daily). The logo is read from the
 * onboarding logo store (localStorage mock) and updates live when changed.
 */
export default function useSchoolBrand() {
    const [brand, setBrand] = useState(() => {
        let base = null;
        try {
            const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (raw && Date.now() - raw.ts < CACHE_TTL) base = raw.brand;
        } catch { /* ignore */ }
        return base ? { ...base, logoUrl: getSchoolLogo() } : null;
    });

    useEffect(() => {
        // Keep the logo in sync when it's uploaded/changed elsewhere.
        const syncLogo = () => setBrand(prev => (prev ? { ...prev, logoUrl: getSchoolLogo() } : prev));
        window.addEventListener('school-brand-changed', syncLogo);
        return () => window.removeEventListener('school-brand-changed', syncLogo);
    }, []);

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
                setBrand({ ...next, logoUrl: getSchoolLogo() });
            } catch { /* branding is decorative — fail silently */ }
        })();
        return () => { alive = false; };
    }, [brand]);

    return brand;
}
