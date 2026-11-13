import { useState, useEffect, useCallback } from 'react';
import { getOnboardingState, isWithinGoLiveWindow } from '../services/onboardingAPIs.js';
import { useAuth } from '../../../../contexts/AuthContext.jsx';

const CACHE_KEY = 'educonnect-onboarding-state-v3';
const CACHE_TTL = 30 * 1000; // 30s — keeps the topbar chip from refetching on every page

/**
 * useSetupProgress — thin hook over onboardingAPIs.getOnboardingState().
 * Plain useState + useEffect; cached briefly in sessionStorage so the chip
 * doesn't hammer the list endpoints. Call refresh() to force a re-read
 * (the checklist page does this on mount and on window focus).
 */
export default function useSetupProgress() {
    const { user } = useAuth();
    const identity = user?.id ?? user?.userId ?? user?.email;
    const key = identity ? `${CACHE_KEY}:${identity}:${user?.schoolId ?? ''}` : null;
    const [state, setState] = useState(() => {
        try {
            const raw = key ? JSON.parse(sessionStorage.getItem(key)) : null;
            if (raw && Date.now() - raw.ts < CACHE_TTL) return raw.state;
        } catch { /* ignore */ }
        return null;
    });
    const [loading, setLoading] = useState(!state);

    const load = useCallback(async () => {
        try {
            const next = await getOnboardingState();
            try { if (key) sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), state: next })); } catch { /* storage unavailable */ }
            setState(next);
        } catch {
            /* leave previous state */
        } finally {
            setLoading(false);
        }
    }, [key]);

    useEffect(() => {
        if (!state) load();
        else setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        loading,
        steps: state?.steps ?? [],
        percent: state?.percent ?? 0,
        doneCount: state?.doneCount ?? 0,
        total: state?.total ?? 0,
        complete: state?.complete ?? false,
        goLive: state?.goLive ?? null,
        logoUrl: state?.logoUrl ?? null,
        withinGoLiveWindow: isWithinGoLiveWindow(state?.goLive),
        refresh: load,
    };
}

