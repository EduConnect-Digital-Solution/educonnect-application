import React from 'react';
import BrandMark from './BrandMark.jsx';

/**
 * Drop-in replacement for lucide's `Loader2` used as an inline spinner.
 * Accepts the same `size` and `className` props. It always uses the quiet
 * "pulse" motion, which stays readable at 10-24px. Colour classes are ignored
 * because the mark carries the brand colours (pass `label` when the icon is the only loading cue); `text-white` switches to a white
 * mark for use on dark buttons.
 */
export default function LoaderIcon({ size = 16, className = '', label }) {
    const px = typeof size === 'number' ? size : parseInt(size, 10) || 16;
    const onDark = className.split(/\s+/).includes('text-white');
    // Keep layout classes (margins, shrink, absolute positioning); drop animation and colours.
    const layout = className
        .split(/\s+/)
        .filter((c) => c && c !== 'animate-spin' && !/^(text|border)-/.test(c) && !/^(w|h)-/.test(c))
        .join(' ');
    // Block-sized spinners (24px and up) stood in for whole loading states, so they
    // render the full Open book mark at a legible size instead of a tiny icon.
    const block = px >= 20;
    const markSize = block ? 64 : px * 0.92;
    const box = block ? { width: markSize, height: (markSize * 551) / 512 } : { width: px, height: px };
    return (
        <span {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })} className={`inline-flex align-middle ${layout}`.trim()} style={{ ...box, alignItems: 'center', justifyContent: 'center' }}>
            <BrandMark size={markSize} variant={block ? 'open' : 'pulse'} tone={onDark ? 'on-dark' : undefined} />
        </span>
    );
}
