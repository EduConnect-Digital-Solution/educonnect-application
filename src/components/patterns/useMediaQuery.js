import { useState, useEffect } from 'react';

/** True while the media query matches. Used to mount one layout instead of hiding a duplicate with CSS. */
export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = (e) => setMatches(e.matches);
        setMatches(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [query]);
    return matches;
}
