import React, { useEffect, useState } from 'react';
import BrandMark from './BrandMark.jsx';
import wordmark from '@/assets/images/wordmark.png';
import wordmarkLight from '@/assets/images/wordmark_light.png';
import './brandLoader.css';

/**
 * Loading indicator with timing rules:
 *  - nothing for the first `delay` ms (default 200) so quick loads stay quiet
 *  - after 6 s the label changes to "Still working…"
 *  - after 15 s it says it is taking longer than usual, with Retry when `onRetry` is given
 * Always announces the label through a status region.
 */
export function BrandLoader({ label = 'Loading', variant = 'open', size = 48, delay = 200, wordmark: withWordmark = false, showLabel = true, onRetry, className = '' }) {
    const [stage, setStage] = useState(delay === 0 ? 1 : 0);
    useEffect(() => {
        const timers = [];
        if (delay > 0) timers.push(setTimeout(() => setStage(1), delay));
        timers.push(setTimeout(() => setStage(2), 6000));
        timers.push(setTimeout(() => setStage(3), 15000));
        return () => timers.forEach(clearTimeout);
    }, [delay]);

    if (stage === 0) return null;
    const text = stage === 3 ? 'This is taking longer than usual' : stage === 2 ? 'Still working…' : label;
    return (
        <div role="status" aria-live="polite" className={`ec-loader ${className}`.trim()}>
            {withWordmark ? (
                <div className="ec-lockup">
                    <BrandMark size={size} variant={variant} />
                    <img className="ec-wm-light" src={wordmark} alt="EduConnect" />
                    <img className="ec-wm-dark" src={wordmarkLight} alt="" />
                </div>
            ) : (
                <BrandMark size={size} variant={variant} />
            )}
            {showLabel ? <span className="ec-loader-label">{text}</span> : <span className="sr-only">{text}</span>}
            {stage === 3 && onRetry && <button type="button" className="ec-retry" onClick={onRetry}>Retry</button>}
        </div>
    );
}

/** Full screen: app boot, route change, sign-in gate. Mark plus wordmark. */
export function PageLoader({ label = 'Loading your workspace…', onRetry, delay = 0 }) {
    return (
        <div className="h-screen w-full flex items-center justify-center">
            <BrandLoader label={label} size={64} wordmark delay={delay} onRetry={onRetry} />
        </div>
    );
}

/** Inside a card, table or panel. */
export function SectionLoader({ label = 'Loading…', size = 40, className = 'py-16', onRetry }) {
    return (
        <div className={`flex items-center justify-center w-full ${className}`}>
            <BrandLoader label={label} size={size} onRetry={onRetry} />
        </div>
    );
}

export default BrandLoader;
