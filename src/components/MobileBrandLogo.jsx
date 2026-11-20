import React, { useState, useEffect } from 'react';
import { Images } from './images.jsx';

/** The EduConnect wordmark for mobile top bars (dashboards keep it in the sidebar on desktop). */
export default function MobileBrandLogo({ className = '' }) {
    const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark');
    useEffect(() => {
        const update = () => setIsDark(document.documentElement.dataset.theme === 'dark');
        window.addEventListener('themeChange', update);
        return () => window.removeEventListener('themeChange', update);
    }, []);
    return <img src={isDark ? Images.main_logo_light : Images.main_logo} alt="EduConnect" className={`h-7 w-auto shrink-0 ${className}`} />;
}
