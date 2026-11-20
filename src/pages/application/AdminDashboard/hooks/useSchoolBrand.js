import { useState, useEffect } from 'react';
import { getSchoolProfile } from '../../../auth/authAPIs.js';
import { getSchoolSettings, uploadPendingLogo } from '../services/onboardingAPIs.js';
import { useAuth } from '../../../../contexts/AuthContext.jsx';

// Branding belongs to the current signed-in school. Reload it when the profile
// changes instead of keeping a browser-wide copy for a different school.
export default function useSchoolBrand() {
    const { user } = useAuth();
    const email = user?.email ?? null;
    const identity = `${user?.id ?? user?.userId ?? email ?? ''}:${user?.schoolId ?? ''}`;
    const [brand, setBrand] = useState(null);

    useEffect(() => {
        let active = true;
        setBrand(null);
        let request = 0;
        const load = async () => {
            const sequence = ++request;
            try {
                const [profile, settings] = await Promise.all([getSchoolProfile(), getSchoolSettings().catch(() => null)]);
                const school = profile?.data?.school;
                if (!school) return;
                let logoUrl = settings?.logoUrl;
                if (!logoUrl) logoUrl = await uploadPendingLogo(email).catch(() => null);
                if (active && sequence === request) setBrand({ name: school.schoolName ?? 'Your school', schoolId: school.schoolId ?? '', type: school.schoolType ?? '', logoUrl: logoUrl ?? null });
            } catch { /* Branding is decorative. */ }
        };
        load();
        window.addEventListener('school-brand-changed', load);
        return () => { active = false; window.removeEventListener('school-brand-changed', load); };
    }, [identity, email]);

    return brand;
}
